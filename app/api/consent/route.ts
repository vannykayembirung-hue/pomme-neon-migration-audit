import { recordConsent } from '@/lib/admin/events'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const limited = await rateLimit('consent', clientIp(request), { limit: 30, window: '1 m' })
  if (!limited.allowed) return tooManyRequests(limited)
  const body = (await request.json().catch(() => null)) as { analytics?: unknown; marketing?: unknown } | null
  if (!body) return new Response(null, { status: 400 })
  await recordConsent(body.analytics === true, body.marketing === true)
  return new Response(null, { status: 204 })
}
