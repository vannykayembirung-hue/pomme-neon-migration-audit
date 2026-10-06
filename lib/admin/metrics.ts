import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pendingSubscribers, sentLog, users, weeklyPlans } from '@/lib/db/schema'
import { consentCounts, listEvents } from './events'
import { queueHealth } from './queue'
import { subscriberCount } from './subscribers'

const DAY = 24 * 60 * 60 * 1000

export async function getMetrics() {
  const [events, subscribers, consent, sentRows, queue, accounts, savedWeeks, pending] = await Promise.all([
    listEvents(),
    subscriberCount(),
    consentCounts(),
    db.select().from(sentLog).orderBy(desc(sentLog.at)).limit(20),
    queueHealth(),
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(weeklyPlans),
    db.select({ n: sql<number>`count(*)::int` }).from(pendingSubscribers),
  ])
  const now = Date.now()
  const plans = events.filter((e) => e.type === 'plan_generated')
  const since = (ms: number) => plans.filter((e) => now - Date.parse(e.at) <= ms).length

  const tally = (list: { detail?: string }[]) => {
    const out: Record<string, number> = {}
    for (const e of list) if (e.detail) out[e.detail] = (out[e.detail] ?? 0) + 1
    return Object.entries(out).sort((a, b) => b[1] - a[1])
  }

  const totalConsent = consent.all + consent.none + consent.custom
  return {
    plans: { week: since(7 * DAY), month: since(30 * DAY), all: plans.length },
    moods: tally(plans).slice(0, 6),
    paywallByReason: tally(events.filter((e) => e.type === 'paywall_open')),
    shares: tally(events.filter((e) => e.type === 'share')),
    accounts: { users: accounts[0]?.n ?? 0, savedWeeks: savedWeeks[0]?.n ?? 0 },
    newsletter: { subscribers, pending: pending[0]?.n ?? 0 },
    emailQueue: queue,
    consent: {
      ...consent,
      total: totalConsent,
      acceptRatePct: totalConsent ? Math.round(((consent.all + consent.custom) / totalConsent) * 100) : null,
    },
    sent: sentRows.map((r) => ({ email: r.email, kind: r.kind, at: r.at.toISOString() })),
    recent: events.slice(-20).reverse(),
  }
}
