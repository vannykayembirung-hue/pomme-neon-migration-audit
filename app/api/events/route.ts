import { recordEvent } from '@/lib/admin/events'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'

// Only accepts events the browser sends after analytics consent. Stores no IP, user agent or identifier.
export async function POST(request: Request) {
  const limited = await rateLimit('events', clientIp(request), { limit: 60, window: '1 m' })
  if (!limited.allowed) return tooManyRequests(limited)
  const body = (await request.json().catch(() => null)) as
    | { type?: string; locale?: string; mood?: string; reason?: string; channel?: string }
    | null
  if (!body || typeof body.type !== 'string') return new Response(null, { status: 400 })
  await recordEvent(body.type, String(body.locale ?? 'us'), body.mood ?? body.reason ?? body.channel)
  return new Response(null, { status: 204 })
}
