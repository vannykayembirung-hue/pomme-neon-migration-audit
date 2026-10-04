import { unsubscribe } from '@/lib/admin/subscribers'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'

// RFC 8058 one-click unsubscribe: mail clients POST here from the List-Unsubscribe header. GET never changes state.
export async function POST(request: Request) {
  const limited = await rateLimit('unsubscribe', clientIp(request), { limit: 30, window: '1 m' })
  if (!limited.allowed) return tooManyRequests(limited)
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const ok = await unsubscribe(token)
  return new Response(null, { status: ok ? 200 : 404 })
}
