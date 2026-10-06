import { NextResponse } from 'next/server'
import { loadAccount } from '@/lib/pomme/account'
import { drizzleUserRepo } from '@/lib/db/user-repo'
import { authSecret, readSessionCookie } from '@/lib/pomme/api-session'
import { PRICES, priceLabel } from '@/lib/pomme/content'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
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
  if (!saspayConfigured())
    return NextResponse.json(
      {
        error: 'billing-not-configured',
        hint: 'Payments are not configured on the server — in Vercel, Settings → Environment Variables, add SASPAY_API_KEY (the value starts with sk_live_).',
      },
      { status: 503 },
    )

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

  // Money must never move if we cannot record the order — probe the store first.
  try {
    await db.select().from(orders).limit(1)
  } catch {
    return NextResponse.json(
      {
        error: 'db-not-ready',
        hint: 'The payment store is not ready — run migrations/0003_billing.sql in the Neon SQL Editor (table pomme_orders is missing).',
      },
      { status: 503 },
    )
  }

  const origin = new URL(request.url).origin
  const createResult = await createCheckoutSession({
    amount: Number.isInteger(amount) ? `${amount}.00` : `${amount.toFixed(2)}`,
    currency: price.currency,
    country: locale === 'uk' ? 'GB' : 'US',
    description: `Pomme Plus — ${PLAN_DAYS[plan]} days (${priceLabel(amount, locale)})`,
    customerEmail: account.email,
    customerName: account.email.split('@')[0],
    returnUrl: `${origin}/billing/success`,
    metadata: { email: account.email, plan, days: String(PLAN_DAYS[plan]) },
  })
  const session = createResult.data
  if (!session)
    return NextResponse.json(
      {
        error: 'checkout-failed',
        hint: `SasPay refused the request (${createResult.status}: ${createResult.detail}) — check that SASPAY_API_KEY in Vercel holds the full key starting with sk_live_. Nothing has been charged.`,
      },
      { status: 502 },
    )

  try {
    await createOrder(session.id, account.email, plan)
  } catch {
    return NextResponse.json(
      {
        error: 'db-not-ready',
        hint: 'The payment store is not ready — run migrations/0003_billing.sql in the Neon SQL Editor. Nothing has been charged.',
      },
      { status: 503 },
    )
  }
  return NextResponse.json({ ok: true, checkoutUrl: session.checkout_url, orderId: session.id })
}
