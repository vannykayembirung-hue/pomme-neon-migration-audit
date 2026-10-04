import { cookies } from 'next/headers'
import { ADMIN_COOKIE, hashToken, safeEqual } from '@/lib/admin/auth'

import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const limited = await rateLimit('admin-login', clientIp(request), { limit: 8, window: '15 m', strict: true })
  if (!limited.allowed) {
    return tooManyRequests(limited, { ok: false, error: 'Try again later.' })
  }
  const body = (await request.json().catch(() => null)) as { passphrase?: unknown } | null
  const token = process.env.ADMIN_TOKEN
  if (!token || typeof body?.passphrase !== 'string' || !safeEqual(body.passphrase, token)) {
    return Response.json({ ok: false, error: 'That did not work.' }, { status: 401 })
  }
  ;(await cookies()).set(ADMIN_COOKIE, hashToken(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
  return Response.json({ ok: true })
}
