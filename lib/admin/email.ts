export type SendResult = { ok: true } | { ok: false; reason: string }
export type Mail = { subject: string; html: string; text: string; headers?: Record<string, string> }

/** Needs RESEND_API_KEY and NEWSLETTER_FROM (e.g. "Pomme <hello@yourdomain.com>", domain verified in Resend). */
export async function sendEmail(to: string, mail: Mail, idempotencyKey?: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.NEWSLETTER_FROM
  if (!key || !from) return { ok: false, reason: 'missing RESEND_API_KEY or NEWSLETTER_FROM' }
  try {
    const res = await fetch(process.env.RESEND_API_URL ?? 'https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ from, to, subject: mail.subject, html: mail.html, text: mail.text, headers: mail.headers }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok ? { ok: true } : { ok: false, reason: `resend ${res.status}` }
  } catch {
    return { ok: false, reason: 'network' }
  }
}
