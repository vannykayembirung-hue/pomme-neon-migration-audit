import { NextResponse } from 'next/server'
import { signup } from '@/lib/pomme/account'
import { drizzleUserRepo } from '@/lib/db/user-repo'
import {
  SESSION_COOKIE,
  authSecret,
  sessionCookieOptions,
  stampedFromPayload,
} from '@/lib/pomme/api-session'

export async function POST(request: Request) {
  const secret = authSecret()
  if (!secret) return NextResponse.json({ error: 'auth-not-configured' }, { status: 503 })
  let body: { email?: unknown; password?: unknown; local?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 })
  }
  const result = await signup(
    drizzleUserRepo(),
    secret,
    String(body.email ?? ''),
    String(body.password ?? ''),
    stampedFromPayload(body.local),
  )
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  const response = NextResponse.json({
    ok: true,
    email: String(body.email ?? '').trim().toLowerCase(),
    state: result.merged?.merged.state ?? null,
    savedAt: result.merged?.merged.savedAt ?? null,
    source: result.merged?.source ?? null,
  })
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions)
  return response
}
