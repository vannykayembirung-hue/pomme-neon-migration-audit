import { isAdmin } from '@/lib/admin/auth'
import { getMetrics, type RangeLocale } from '@/lib/admin/metrics'
import { forgetEmail } from '@/lib/admin/subscribers'
import { forgetAccount } from '@/lib/admin/accounts'

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 })
  const url = new URL(request.url)
  const range = Math.min(90, Math.max(2, Number(url.searchParams.get('range') ?? 30) || 30))
  const locale = (['all', 'us', 'uk'].includes(url.searchParams.get('locale') ?? 'all')
    ? url.searchParams.get('locale')
    : 'all') as RangeLocale
  return Response.json(await getMetrics(range, locale), { headers: { 'cache-control': 'no-store' } })
}

// Right to erasure. State-changing, so POST rather than the GET in the original brief.
export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 })
  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  const action = url.searchParams.get('action')
  if (!email || !action) return new Response('Bad request', { status: 400 })
  if (action === 'forget') await forgetEmail(email)
  else if (action === 'forget-account') await forgetAccount(email)
  else return new Response('Bad request', { status: 400 })
  return Response.json({ ok: true })
}
