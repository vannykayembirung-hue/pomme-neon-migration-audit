import { NextResponse } from 'next/server'
import { loadAccount } from '@/lib/pomme/account'
import { drizzleUserRepo } from '@/lib/db/user-repo'
import { authSecret, readSessionCookie } from '@/lib/pomme/api-session'
import { getCheckoutStatus, sessionPaid } from '@/lib/billing/saspay'
import { getEntitlement, isPlus, pendingOrdersFor, settleOrder } from '@/lib/billing/entitlements'

/**
 * GET /api/billing/checkout-status[?id=<order id>]
 * Called when the buyer returns from the hosted checkout. Reconciles the
 * account's pending orders with SasPay server-side and settles them
 * idempotently. Works even if the return URL carries no order id (SasPay
 * makes no promise about redirect params) — identity always from the session.
 */
export async function GET(request: Request) {
  const secret = authSecret()
  if (!secret) return NextResponse.json({ error: 'auth-not-configured' }, { status: 503 })
  const token = readSessionCookie(request)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const account = await loadAccount(drizzleUserRepo(), token, secret)
  if (!account) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id') ?? ''
  const mine = await pendingOrdersFor(account.email).catch(() => null)
  if (!mine)
    return NextResponse.json(
      {
        error: 'db-not-ready',
        hint: 'The payment store is not ready — run migrations/0003_billing.sql in the Neon SQL Editor.',
      },
      { status: 503 },
    )

  // Only the account's own orders are ever touched — never someone else's.
  const targets = id ? mine.filter((o) => o.id === id) : mine
  let settled = false
  for (const order of targets) {
    const r = await getCheckoutStatus(order.id)
    if (sessionPaid(r.data)) {
      await settleOrder(order.id)
      settled = true
    }
  }

  const ent = await getEntitlement(account.email)
  return NextResponse.json({
    ok: true,
    paid: isPlus(ent?.plusUntil ?? null),
    settled,
    plusUntil: ent?.plusUntil?.toISOString() ?? null,
  })
}
