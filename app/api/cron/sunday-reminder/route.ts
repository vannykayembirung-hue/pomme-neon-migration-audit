import { sendSundayReminders } from '@/lib/admin/queue'
import { cronAuthorised } from '@/lib/cron-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return new Response('Unauthorized', { status: 401 })
  const limited = await rateLimit('cron-sunday-reminder', 'cron', { limit: 5, window: '1 m' })
  if (!limited.allowed) return tooManyRequests(limited)
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'
  return Response.json(await sendSundayReminders(dryRun))
}
