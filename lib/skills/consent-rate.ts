import type { Skill } from './types'

type Counts = { all: number; none: number; custom: number }
const rate = (c: Counts) => {
  const total = c.all + c.none + c.custom
  return total ? Math.round(((c.all + c.custom) / total) * 100) : null
}

export const consentRateSkill: Skill = {
  name: 'consent-rate',
  description: 'Weekly digest of how the cookie-consent accept rate changed.',
  async run(ctx) {
    const current = await ctx.readJson<Counts>('consent.json', { all: 0, none: 0, custom: 0 })
    const previous = await ctx.readJson<Counts | null>('consent_prev.json', null)
    const now = rate(current)
    const before = previous ? rate(previous) : null
    const delta = now !== null && before !== null ? now - before : null
    const summary =
      now === null
        ? 'No consent choices recorded yet.'
        : `Accept rate ${now}%${delta === null ? '' : ` (${delta >= 0 ? '+' : ''}${delta} points since last week)`}.`
    await ctx.writeText('consent_prev.json', JSON.stringify(current))
    return { ok: true, summary, data: { now, before, delta } }
  },
}
