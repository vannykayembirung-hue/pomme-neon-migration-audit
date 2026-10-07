import { NextResponse } from 'next/server'
import { loadAccount, saveAccount } from '@/lib/pomme/account'
import { drizzleUserRepo } from '@/lib/db/user-repo'
import { authSecret, readSessionCookie, stampedFromPayload } from '@/lib/pomme/api-session'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'

/**
 * GET  /api/plan — the session user's saved week (401 without a session).
 * PUT  /api/plan — save the session user's week. The body carries state ONLY;
 * the user is always derived from the cookie, never from the payload.
 */
export async function GET(request: Request) {
  const secret = authSecret()
  if (!secret) return NextResponse.json({ error: 'auth-not-configured' }, { status: 503 })
  const token = readSessionCookie(request)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const account = await loadAccount(drizzleUserRepo(), token, secret)
  if (!account) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ ok: true, state: account.plan?.state ?? null, savedAt: account.plan?.savedAt ?? null })
}

export async function PUT(request: Request) {
  const limited = await rateLimit('plan-put', clientIp(request), { limit: 20, window: '1 m', strict: true })
  if (!limited.allowed) return tooManyRequests(limited, { error: 'too-many-requests' })
  const secret = authSecret()
  if (!secret) return NextResponse.json({ error: 'auth-not-configured' }, { status: 503 })
  const token = readSessionCookie(request)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { state?: unknown; savedAt?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 })
  }
  const plan = stampedFromPayload(body.state)
  if (!plan) return NextResponse.json({ error: 'bad-state' }, { status: 400 })
  const saved = await saveAccount(drizzleUserRepo(), token, secret, plan)
  if (!saved) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ ok: true, savedAt: plan.savedAt })
}
