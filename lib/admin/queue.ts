import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { emailQueue, sentLog } from '@/lib/db/schema'
import { sendEmail } from './email'
import { sundayReminderEmail, welcomeEmail } from './email-templates'
import { getSubscriber, listEmails } from './subscribers'

const MAX_ATTEMPTS = 6
const BACKOFF_MINUTES = [1, 5, 30, 120, 720, 1440]
/** A claimed job is invisible to other workers for this long, which stops duplicate sends. */
const LEASE_SECONDS = 120

type Job = { id: number; email: string; kind: string; attempts: number }

export async function enqueueWelcome(email: string) {
  await db.insert(emailQueue).values({ email, kind: 'welcome' }).onConflictDoNothing()
}

async function claim(where: ReturnType<typeof sql>, limit = 1): Promise<Job[]> {
  const res = await db.execute<{ id: string; email: string; kind: string; attempts: number }>(sql`
    UPDATE pomme_email_queue
    SET attempts = attempts + 1, next_attempt_at = now() + make_interval(secs => ${LEASE_SECONDS})
    WHERE id IN (
      SELECT id FROM pomme_email_queue
      WHERE status = 'pending' AND next_attempt_at <= now() AND ${where}
      ORDER BY next_attempt_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, email, kind, attempts`)
  return res.rows.map((r) => ({ id: Number(r.id), email: r.email, kind: r.kind, attempts: r.attempts }))
}

async function finish(job: Job, outcome: { ok: true } | { ok: false; reason: string; final?: boolean }) {
  if (outcome.ok) {
    await db.update(emailQueue).set({ status: 'sent', sentAt: new Date(), lastError: null }).where(eq(emailQueue.id, job.id))
    await db.insert(sentLog).values({ email: job.email, kind: job.kind, period: 'once' }).onConflictDoNothing()
    return
  }
  const exhausted = outcome.final || job.attempts >= MAX_ATTEMPTS
  const delayMin = BACKOFF_MINUTES[Math.min(job.attempts - 1, BACKOFF_MINUTES.length - 1)]
  await db
    .update(emailQueue)
    .set({
      status: exhausted ? 'failed' : 'pending',
      lastError: outcome.reason.slice(0, 200),
      nextAttemptAt: new Date(Date.now() + delayMin * 60_000),
    })
    .where(eq(emailQueue.id, job.id))
}

async function run(job: Job): Promise<boolean> {
  const sub = await getSubscriber(job.email)
  if (!sub) {
    await db.update(emailQueue).set({ status: 'cancelled' }).where(eq(emailQueue.id, job.id))
    return false
  }
  const result = await sendEmail(job.email, welcomeEmail(sub.unsubscribeToken), `${job.kind}:${job.email}`)
  await finish(job, result)
  return result.ok
}

/** Sends the welcome email now. On failure the job stays queued for retry. Returns whether it was delivered. */
export async function deliverWelcomeNow(email: string): Promise<boolean> {
  await enqueueWelcome(email)
  for (let attempt = 0; attempt < 2; attempt++) {
    const [job] = await claim(sql`email = ${email} AND kind = 'welcome'`)
    if (!job) return false
    if (await run(job)) return true
    // One quick in-request retry for transient errors; anything still failing is retried by the cron with backoff.
    await db.update(emailQueue).set({ nextAttemptAt: new Date() }).where(and(eq(emailQueue.id, job.id), eq(emailQueue.status, 'pending')))
    await new Promise((r) => setTimeout(r, 1200))
  }
  return false
}

export async function processQueue() {
  const jobs = await claim(sql`kind = 'welcome'`, 50)
  let sent = 0
  for (const job of jobs) if (await run(job)) sent++
  return { due: jobs.length, sent }
}

export async function queueHealth() {
  const rows = await db
    .select({ status: emailQueue.status, n: sql<number>`count(*)::int` })
    .from(emailQueue)
    .groupBy(emailQueue.status)
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>
}

function isoWeekKey(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Each subscriber gets at most one reminder per ISO week: the sent_log row is claimed before sending. */
export async function sendSundayReminders(dryRun = false) {
  const period = isoWeekKey(new Date())
  const subs = await listEmails()
  let count = 0
  for (const sub of subs) {
    if (dryRun) {
      const [done] = await db
        .select({ id: sentLog.id })
        .from(sentLog)
        .where(and(eq(sentLog.email, sub.email), eq(sentLog.kind, 'sunday-reminder'), eq(sentLog.period, period)))
        .limit(1)
      if (!done) count++
      continue
    }
    const [claimed] = await db
      .insert(sentLog)
      .values({ email: sub.email, kind: 'sunday-reminder', period })
      .onConflictDoNothing()
      .returning({ id: sentLog.id })
    if (!claimed) continue
    const result = await sendEmail(sub.email, sundayReminderEmail(sub.unsubscribeToken), `sunday-reminder:${period}:${sub.email}`)
    if (result.ok) count++
    else await db.delete(sentLog).where(eq(sentLog.id, claimed.id))
  }
  return { subscribers: subs.length, sent: count, dryRun, period }
}
