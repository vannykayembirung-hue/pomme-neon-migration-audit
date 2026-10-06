import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/billing/saspay'
import { getCheckoutStatus, sessionPaid } from '@/lib/billing/saspay'
import { pendingOrders, settleOrder } from '@/lib/billing/entitlements'

/**
 * POST /api/billing/webhook — SasPay notifications (HMAC-signed).
 * Created in the SasPay dashboard (URL + transaction.success subscription).
 * Because the transaction payload carries no merchant metadata, a successful
 * transaction reconciles recent pending orders via the status endpoint —
 * deterministic and idempotent.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-webhook-signature') ?? ''
  const timestamp = request.headers.get('x-webhook-timestamp') ?? ''
  const secret = process.env.SASPAY_WEBHOOK_SECRET ?? ''
  if (!verifyWebhookSignature(rawBody, signature, timestamp, secret)) {
    return new Response('invalid signature', { status: 400 })
  }

  let payload: { event?: string } | null = null
  try {
    payload = JSON.parse(rawBody)
  } catch {
    payload = null
  }

  if (payload?.event === 'transaction.success' || payload?.event === 'webhook.test') {
    const pending = await pendingOrders()
    for (const order of pending) {
      const session = (await getCheckoutStatus(order.id)).data
      if (sessionPaid(session)) await settleOrder(order.id)
    }
  }
  return NextResponse.json({ ok: true })
}
