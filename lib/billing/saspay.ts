import crypto from 'node:crypto'

/**
 * Phase 2.9 — SasPay client. Built strictly from docs.saspay.me:
 * POST /checkout-sessions/, GET /checkout-sessions/{id}/status/,
 * webhook signature = HMAC-SHA256 hex of `${timestamp}.${rawBody}` (5-min tolerance).
 * Secrets stay server-side. Never invent endpoints beyond the OpenAPI spec.
 */
const API = process.env.SASPAY_API_URL ?? 'https://api.saspay.me/api/v1'

function key() {
  return process.env.SASPAY_API_KEY ?? ''
}

export function saspayConfigured() {
  return key().length > 0
}

export type CheckoutSession = {
  id: string
  slug: string
  checkout_url: string
  amount: string
  currency: string
  status: string
  paid_at: string | null
  metadata: Record<string, unknown>
  transaction: { status?: string; reference?: string } | null
}

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!key()) return null
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  }).catch(() => null)
  if (!res || !res.ok) return null
  const body = (await res.json().catch(() => null)) as { success?: boolean; data?: T } | T | null
  if (!body) return null
  // The live API wraps payloads as { success, data } — accept both shapes.
  if (typeof body === 'object' && body !== null && 'success' in body && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

export function createCheckoutSession(input: {
  amount: string
  currency: string
  country: string
  description: string
  customerEmail: string
  customerName: string
  returnUrl: string
  metadata: Record<string, string>
}) {
  return call<CheckoutSession>('/checkout-sessions/', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      country: input.country,
      description: input.description,
      customer_email: input.customerEmail,
      customer_name: input.customerName,
      return_url: input.returnUrl,
      metadata: input.metadata,
    }),
  })
}

export function getCheckoutStatus(id: string) {
  return call<CheckoutSession>(`/checkout-sessions/${encodeURIComponent(id)}/status/`)
}

/** Webhook authenticity: age ≤ 5 min, then HMAC over the RAW body. */
export function verifyWebhookSignature(rawBody: string, signature: string, timestamp: string, secret: string): boolean {
  if (!secret || !signature || !timestamp) return false
  const now = Math.floor(Date.now() / 1000)
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** A session counts as paid when SasPay says so. */
export function sessionPaid(session: CheckoutSession | null): boolean {
  if (!session) return false
  if (session.paid_at) return true
  const s = (session.status ?? '').toUpperCase()
  return s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED'
}
