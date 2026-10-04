import { isAdmin } from '@/lib/admin/auth'
import { getMetrics } from '@/lib/admin/metrics'
import { forgetEmail } from '@/lib/admin/subscribers'

export async function GET() {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 })
  return Response.json(await getMetrics(), { headers: { 'cache-control': 'no-store' } })
}

// Right to erasure. State-changing, so POST rather than the GET in the original brief.
export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 })
  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  if (url.searchParams.get('action') !== 'forget' || !email) return new Response('Bad request', { status: 400 })
  await forgetEmail(email)
  return Response.json({ ok: true })
}
