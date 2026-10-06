import { NextResponse } from 'next/server'
import { loadAccount } from '@/lib/pomme/account'
import { drizzleUserRepo } from '@/lib/db/user-repo'
import { authSecret, readSessionCookie } from '@/lib/pomme/api-session'
import { PRICES, priceLabel } from '@/lib/pomme/content'
import { createCheckoutSession, saspayConfigured } from '@/lib/billing/saspay'
import { PLAN_DAYS, createOrder, type Plan } from '@/lib/billing/entitlements'

/**
 * POST /api/billing/checkout { plan: 'monthly' | 'annual', locale: 'us' | 'uk' }
 * Creates a SasPay hosted checkout session. Identity always from the session
 * cookie — never from the payload. No card data touches this server.
 */
export async function POST(request: Request) {
  const secret = authSecret()
  if (!secret) return NextResponse.json({ error: 'auth-not-configured' }, { status: 503 })
  const token = readSessionCookie(request)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const account = await loadAccount(drizzleUserRepo(), token, secret)
  if (!account) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!saspayConfigured()) return NextResponse.json({ error: 'billing-not-configured' }, { status: 503 })

  let body: { plan?: string; locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 })
  }
  const plan: Plan = body.plan === 'annual' ? 'annual' : 'monthly'
  const locale = body.locale === 'uk' ? 'uk' : 'us'
  const price = PRICES[locale]
  const amount = plan === 'annual' ? price.annual : price.monthly

  const origin = new URL(request.url).origin
  const session = await createCheckoutSession({
    amount: Number.isInteger(amount) ? `${amount}.00` : `${amount.toFixed(2)}`,
    currency: price.currency,
    country: locale === 'uk' ? 'GB' : 'US',
    description: `Pomme Plus — ${PLAN_DAYS[plan]} days (${priceLabel(amount, locale)})`,
    customerEmail: account.email,
    customerName: account.email.split('@')[0],
    returnUrl: `${origin}/billing/success`,
    metadata: { email: account.email, plan, days: String(PLAN_DAYS[plan]) },
  })
  if (!session) return NextResponse.json({ error: 'checkout-failed' }, { status: 502 })

  await createOrder(session.id, account.email, plan)
  return NextResponse.json({ ok: true, checkoutUrl: session.checkout_url, orderId: session.id })
}
