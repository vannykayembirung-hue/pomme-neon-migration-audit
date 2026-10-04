import { sendEmail } from '@/lib/admin/email'
import { confirmEmail } from '@/lib/admin/email-templates'
import { EMAIL_RE, addPending, isSubscribed, normaliseEmail } from '@/lib/admin/subscribers'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { SITE_URL } from '@/lib/site'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; locale?: unknown } | null
  const email = typeof body?.email === 'string' ? normaliseEmail(body.email) : ''
  if (!EMAIL_RE.test(email)) return Response.json({ ok: false, error: 'invalid' }, { status: 400 })

  const byIp = await rateLimit('subscribe-ip', clientIp(request), { limit: 5, window: '10 m', strict: true })
  // Per-address limit stops the form being used to mail-bomb someone else's inbox.
  const byEmail = await rateLimit('subscribe-email', email, { limit: 3, window: '1 h', strict: true })
  if (!byIp.allowed) return tooManyRequests(byIp, { ok: false, error: 'slow-down' })
  if (!byEmail.allowed) return tooManyRequests(byEmail, { ok: false, error: 'slow-down' })

  try {
    // Same response whether or not already subscribed, so the form can't be used to probe the list.
    if (await isSubscribed(email)) return Response.json({ ok: true })

    const locale = body?.locale === 'uk' ? 'uk' : 'us'
    const token = await addPending(email, locale)
    const result = await sendEmail(email, confirmEmail(token))
    if (!result.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[newsletter] email not sent (${result.reason}). Dev confirm link: ${SITE_URL}/newsletter/confirm?token=${token}`)
        return Response.json({ ok: true, delivered: false })
      }
      console.error(`[newsletter] confirmation email failed: ${result.reason}`)
      return Response.json({ ok: false, error: 'delivery' }, { status: 502 })
    }
    return Response.json({ ok: true })
  } catch (error) {
    console.error('[newsletter] subscribe failed', error)
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503 })
  }
}
