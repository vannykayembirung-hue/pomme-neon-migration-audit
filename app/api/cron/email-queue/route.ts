import { processQueue } from '@/lib/admin/queue'
import { cronAuthorised } from '@/lib/cron-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return new Response('Unauthorized', { status: 401 })
  // Cron endpoints are secret-protected; the limiter is a second line of defence
  // against a leaked CRON_SECRET being used to run the queue in a loop.
  const limited = await rateLimit('cron-email-queue', 'cron', { limit: 10, window: '1 m' })
  if (!limited.allowed) return tooManyRequests(limited)
  return Response.json(await processQueue())
}
