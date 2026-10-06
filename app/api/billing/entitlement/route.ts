import { NextResponse } from 'next/server'
import { loadAccount } from '@/lib/pomme/account'
import { drizzleUserRepo } from '@/lib/db/user-repo'
import { authSecret, readSessionCookie } from '@/lib/pomme/api-session'
import { ensureTrial, getEntitlement, isPlus } from '@/lib/billing/entitlements'

/**
 * GET /api/billing/entitlement — the session user's Plus status.
 * First call starts the 7-day trial (no card). Auth code paths untouched.
 */
export async function GET(request: Request) {
  const secret = authSecret()
  if (!secret) return NextResponse.json({ error: 'auth-not-configured' }, { status: 503 })
  const token = readSessionCookie(request)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const account = await loadAccount(drizzleUserRepo(), token, secret)
  if (!account) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const plusUntil = await ensureTrial(account.email)
  const ent = await getEntitlement(account.email)
  return NextResponse.json({
    ok: true,
    isPlus: isPlus(ent?.plusUntil ?? null),
    plusUntil: ent?.plusUntil?.toISOString() ?? plusUntil?.toISOString() ?? null,
  })
}
