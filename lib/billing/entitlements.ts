import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { entitlements, orders } from '@/lib/db/schema'
import { PLAN_DAYS, TRIAL_DAYS, extendPlus, type Plan } from './plus'

/**
 * Phase 2.9 — prepaid Pomme Plus. No recurring billing (SasPay has none):
 * each purchase grants a fixed window; the free trial starts with the account.
 */
export { PLAN_DAYS, TRIAL_DAYS, isPlus, extendPlus, type Plan } from './plus'

export async function getEntitlement(email: string) {
  const [row] = await db.select().from(entitlements).where(eq(entitlements.email, email)).limit(1)
  return row ?? null
}

/** First touch grants the 7-day trial — no card, no obligation. */
export async function ensureTrial(email: string): Promise<Date | null> {
  const existing = await getEntitlement(email)
  if (existing) return existing.plusUntil
  const plusUntil = extendPlus(null, TRIAL_DAYS)
  await db.insert(entitlements).values({ email, plusUntil, trialUsed: true }).onConflictDoNothing()
  return plusUntil
}

export async function grantPlus(email: string, plan: Plan): Promise<Date> {
  const existing = await getEntitlement(email)
  const plusUntil = extendPlus(existing?.plusUntil ?? null, PLAN_DAYS[plan])
  await db
    .insert(entitlements)
    .values({ email, plusUntil, trialUsed: true })
    .onConflictDoUpdate({ target: entitlements.email, set: { plusUntil, updatedAt: new Date() } })
  return plusUntil
}

export async function createOrder(id: string, email: string, plan: Plan) {
  await db.insert(orders).values({ id, email, plan }).onConflictDoNothing()
}

export async function settleOrder(id: string): Promise<{ email: string; plan: Plan; plusUntil: Date } | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order || order.status === 'paid') return null
  const plusUntil = await grantPlus(order.email, order.plan as Plan)
  await db.update(orders).set({ status: 'paid' }).where(eq(orders.id, id))
  return { email: order.email, plan: order.plan as Plan, plusUntil }
}

export async function pendingOrders() {
  return db.select().from(orders).where(eq(orders.status, 'pending'))
}

/** Pending orders of one account — used to settle on return from checkout. */
export async function pendingOrdersFor(email: string) {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.email, email), eq(orders.status, 'pending')))
}
