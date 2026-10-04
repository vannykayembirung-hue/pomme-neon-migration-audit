'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { deliverWelcomeNow } from '@/lib/admin/queue'
import { confirmPending, unsubscribe } from '@/lib/admin/subscribers'
import { rateLimit } from '@/lib/rate-limit'

async function allowed(name: string) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  return (await rateLimit(name, ip, { limit: 20, window: '1 m' })).allowed
}

export async function confirmSubscription(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!(await allowed('newsletter-confirm'))) redirect('/newsletter/done?status=slow')
  const sub = await confirmPending(token)
  if (!sub) redirect('/newsletter/done?status=invalid')
  const delivered = await deliverWelcomeNow(sub.email)
  redirect(`/newsletter/done?status=confirmed${delivered ? '' : '&delayed=1'}`)
}

export async function confirmUnsubscribe(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!(await allowed('newsletter-unsubscribe'))) redirect('/newsletter/done?status=slow')
  const ok = await unsubscribe(token)
  redirect(`/newsletter/done?status=${ok ? 'unsubscribed' : 'invalid'}`)
}
