import { desc, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events as eventsTable, pendingSubscribers, sentLog, weeklyPlans } from '@/lib/db/schema'
import { consentCounts, listEvents } from './events'
import { queueHealth } from './queue'
import { subscriberCount } from './subscribers'
import { listAccounts } from './accounts'

const DAY = 24 * 60 * 60 * 1000

export type RangeLocale = 'all' | 'us' | 'uk'

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

/**
 * Phase 2.8 — real product analytics over the first-party event log.
 * rangeDays/locales drive the analytics blocks; operational blocks stay current.
 */
export async function getMetrics(rangeDays = 30, locale: RangeLocale = 'all') {
  const days = Math.min(90, Math.max(2, Math.floor(rangeDays)))
  const since = new Date(Date.now() - (days - 1) * DAY)

  const [events, subscribers, consent, sentRows, queue, savedWeeks, pending, ranged, accounts] = await Promise.all([
    listEvents(),
    subscriberCount(),
    consentCounts(),
    db.select().from(sentLog).orderBy(desc(sentLog.at)).limit(20),
    queueHealth(),
    db.select({ n: sql<number>`count(*)::int` }).from(weeklyPlans),
    db.select({ n: sql<number>`count(*)::int` }).from(pendingSubscribers),
    db.select().from(eventsTable).where(gte(eventsTable.at, since)),
    listAccounts(),
  ])

  // ── Analytics scope: the selected window and locale. ────────────────────────
  const scoped = ranged.filter((e) => locale === 'all' || e.locale === locale)
  const count = (type: string) => scoped.filter((e) => e.type === type).length

  // Daily buckets (UTC days, zero-filled so charts never lie about gaps).
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) keys.push(dayKey(new Date(Date.now() - i * DAY)))
  const bucket = (type: string) => {
    const out = new Map<string, number>(keys.map((k) => [k, 0]))
    for (const e of scoped) if (e.type === type) out.set(dayKey(new Date(e.at)), (out.get(dayKey(new Date(e.at))) ?? 0) + 1)
    return keys.map((k) => ({ day: k, n: out.get(k) ?? 0 }))
  }

  const visits = count('visit')
  const plansMade = count('plan_generated')
  const signups = count('signup')
  const saves = count('plan_saved')
  const returning = scoped.filter((e) => e.type === 'visit' && e.detail === 'returning').length

  // Swap behaviour: reason = "day-N:oldId>newId" (old events: "day-N").
  const swapEvents = scoped.filter((e) => e.type === 'swap' && e.detail)
  const tallySwap = (side: 'in' | 'out') => {
    const out: Record<string, number> = {}
    for (const e of swapEvents) {
      const detail = e.detail ?? ''
      const idx = detail.indexOf(':')
      if (idx === -1) continue // legacy "day-N" events carry no recipe
      const rest = detail.slice(idx + 1)
      const gt = rest.indexOf('>')
      const key = gt === -1 ? (side === 'in' ? rest : null) : side === 'in' ? rest.slice(gt + 1) : rest.slice(0, gt)
      if (key) out[key] = (out[key] ?? 0) + 1
    }
    return Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }

  const tally = (list: { detail?: string | null }[]) => {
    const out: Record<string, number> = {}
    for (const e of list) if (e.detail) out[e.detail] = (out[e.detail] ?? 0) + 1
    return Object.entries(out).sort((a, b) => b[1] - a[1])
  }

  // Operational totals (all time) — kept from the original dashboard.
  const now = Date.now()
  const allPlans = events.filter((e) => e.type === 'plan_generated')
  const sinceMs = (ms: number) => allPlans.filter((e) => now - Date.parse(e.at) <= ms).length
  const totalConsent = consent.all + consent.none + consent.custom

  return {
    range: { days, locale },
    // ── Analytics (scoped) ──
    kpis: {
      visits,
      pageViews: count('page_view'),
      plans: plansMade,
      signups,
      saves,
      returningPct: visits ? Math.round((returning / visits) * 100) : null,
      perVisitPlanPct: visits ? Math.round((plansMade / visits) * 100) : null,
    },
    series: {
      visits: bucket('visit'),
      plans: bucket('plan_generated'),
      signups: bucket('signup'),
    },
    funnel: [
      ['Visits', visits],
      ['Weeks planned', plansMade],
      ['Accounts created', signups],
      ['Weeks saved to cloud', saves],
    ] as [string, number][],
    swapsIn: tallySwap('in'),
    swapsOut: tallySwap('out'),
    topPages: tally(scoped.filter((e) => e.type === 'page_view')).slice(0, 5),
    // ── Operations (current) ──
    accounts,
    plans: { week: sinceMs(7 * DAY), month: sinceMs(30 * DAY), all: allPlans.length },
    moods: tally(allPlans).slice(0, 6),
    paywallByReason: tally(events.filter((e) => e.type === 'paywall_open')),
    shares: tally(events.filter((e) => e.type === 'share')),
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
