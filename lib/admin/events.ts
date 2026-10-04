import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { consentChoices, events } from '@/lib/db/schema'

export type StoredEvent = { at: string; type: string; locale: string; detail?: string }
const MAX = 5000
const ALLOWED = new Set(['plan_generated', 'paywall_open', 'share', 'newsletter_submit'])

export async function recordEvent(type: string, locale: string, detail?: string) {
  if (!ALLOWED.has(type)) return
  await db.insert(events).values({ type, locale: locale === 'uk' ? 'uk' : 'us', detail: detail?.slice(0, 40) })
}

/** Most recent events, oldest first. */
export async function listEvents(): Promise<StoredEvent[]> {
  const rows = await db.select().from(events).orderBy(desc(events.at)).limit(MAX)
  return rows.reverse().map((r) => ({ at: r.at.toISOString(), type: r.type, locale: r.locale, detail: r.detail ?? undefined }))
}

export type ConsentCounts = { all: number; none: number; custom: number }

export async function recordConsent(analytics: boolean, marketing: boolean) {
  const choice = analytics && marketing ? 'all' : !analytics && !marketing ? 'none' : 'custom'
  await db.insert(consentChoices).values({ choice })
}

export async function consentCounts(): Promise<ConsentCounts> {
  const rows = await db
    .select({ choice: consentChoices.choice, n: sql<number>`count(*)::int` })
    .from(consentChoices)
    .groupBy(consentChoices.choice)
  const out: ConsentCounts = { all: 0, none: 0, custom: 0 }
  for (const r of rows) if (r.choice === 'all' || r.choice === 'none' || r.choice === 'custom') out[r.choice] = r.n
  return out
}
