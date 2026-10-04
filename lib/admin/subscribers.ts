import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { emailQueue, pendingSubscribers, sentLog, subscribers } from '@/lib/db/schema'

export type Subscriber = { email: string; locale: 'us' | 'uk'; confirmedAt: string; unsubscribeToken: string }

const PENDING_TTL_MS = 48 * 60 * 60 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/

export const normaliseEmail = (e: string) => e.trim().toLowerCase()
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')
const cutoff = () => new Date(Date.now() - PENDING_TTL_MS)

const toSubscriber = (r: typeof subscribers.$inferSelect): Subscriber => ({
  email: r.email,
  locale: r.locale === 'uk' ? 'uk' : 'us',
  confirmedAt: r.confirmedAt.toISOString(),
  unsubscribeToken: r.unsubscribeToken,
})

export async function listEmails(): Promise<Subscriber[]> {
  return (await db.select().from(subscribers)).map(toSubscriber)
}

export async function getSubscriber(email: string): Promise<Subscriber | null> {
  const [row] = await db.select().from(subscribers).where(eq(subscribers.email, normaliseEmail(email))).limit(1)
  return row ? toSubscriber(row) : null
}

export async function isSubscribed(email: string) {
  return (await getSubscriber(email)) !== null
}

/** Only a hash of the token is stored, so a database leak cannot be used to confirm addresses. */
export async function addPending(email: string, locale: 'us' | 'uk'): Promise<string> {
  const token = randomBytes(24).toString('base64url')
  await db.transaction(async (tx) => {
    await tx.delete(pendingSubscribers).where(lt(pendingSubscribers.createdAt, cutoff()))
    await tx
      .insert(pendingSubscribers)
      .values({ email, locale, tokenHash: hashToken(token) })
      .onConflictDoUpdate({
        target: pendingSubscribers.email,
        set: { tokenHash: hashToken(token), locale, createdAt: new Date() },
      })
  })
  return token
}

/** Read-only check so link scanners that merely load the page change nothing. */
export async function peekPending(token: string) {
  if (!token) return false
  const rows = await db
    .select({ email: pendingSubscribers.email })
    .from(pendingSubscribers)
    .where(and(eq(pendingSubscribers.tokenHash, hashToken(token)), gt(pendingSubscribers.createdAt, cutoff())))
    .limit(1)
  return rows.length > 0
}

/** Transactional: consuming the token and creating the subscriber are one atomic unit. */
export async function confirmPending(token: string): Promise<Subscriber | null> {
  if (!token) return null
  return db.transaction(async (tx) => {
    const [pending] = await tx
      .delete(pendingSubscribers)
      .where(and(eq(pendingSubscribers.tokenHash, hashToken(token)), gt(pendingSubscribers.createdAt, cutoff())))
      .returning()
    if (!pending) return null
    await tx.insert(subscribers).values({ email: pending.email, locale: pending.locale }).onConflictDoNothing()
    const [row] = await tx.select().from(subscribers).where(eq(subscribers.email, pending.email)).limit(1)
    return row ? toSubscriber(row) : null
  })
}

export async function peekUnsubscribe(token: string) {
  if (!UUID_RE.test(token)) return false
  const rows = await db.select({ email: subscribers.email }).from(subscribers).where(eq(subscribers.unsubscribeToken, token)).limit(1)
  return rows.length > 0
}

/** Transactional: removing the subscriber and their queued mail are one atomic unit. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!UUID_RE.test(token)) return false
  return db.transaction(async (tx) => {
    const [row] = await tx.delete(subscribers).where(eq(subscribers.unsubscribeToken, token)).returning({ email: subscribers.email })
    if (!row) return false
    await tx.delete(emailQueue).where(eq(emailQueue.email, row.email))
    return true
  })
}

export async function forgetEmail(email: string) {
  const e = normaliseEmail(email)
  await db.transaction(async (tx) => {
    await tx.delete(subscribers).where(eq(subscribers.email, e))
    await tx.delete(pendingSubscribers).where(eq(pendingSubscribers.email, e))
    await tx.delete(emailQueue).where(eq(emailQueue.email, e))
    await tx.delete(sentLog).where(eq(sentLog.email, e))
  })
}

export const subscriberCount = async () => {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(subscribers)
  return row?.n ?? 0
}
