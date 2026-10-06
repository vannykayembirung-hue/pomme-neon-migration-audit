import { NextResponse } from 'next/server'
import { loadAccount } from '@/lib/pomme/account'
import { drizzleUserRepo } from '@/lib/db/user-repo'
import { authSecret, readSessionCookie } from '@/lib/pomme/api-session'
import { getCheckoutStatus, sessionPaid } from '@/lib/billing/saspay'
import { getEntitlement, settleOrder } from '@/lib/billing/entitlements'

/**
 * GET /api/billing/checkout-status?id=<order id>
 * Called when the buyer returns from the hosted checkout. Verifies with SasPay
 * server-side and settles the order idempotently.
 */
export async function GET(request: Request) {
  const secret = authSecret()
  if (!secret) return NextResponse.json({ error: 'auth-not-configured' }, { status: 503 })
  const token = readSessionCookie(request)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const account = await loadAccount(drizzleUserRepo(), token, secret)
  if (!account) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'bad-request' }, { status: 400 })

  const session = await getCheckoutStatus(id)
  if (!session) return NextResponse.json({ error: 'status-unavailable' }, { status: 502 })

  const settled = sessionPaid(session) ? await settleOrder(id) : null
  const ent = await getEntitlement(account.email)
  return NextResponse.json({
    ok: true,
    paid: sessionPaid(session),
    settled: !!settled,
    plusUntil: ent?.plusUntil?.toISOString() ?? null,
  })
}
