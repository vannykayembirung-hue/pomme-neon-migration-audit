import type { Skill } from './types'

type Event = { at: string; type: string }

export const weeklyDigestSkill: Skill = {
  name: 'weekly-digest',
  description: 'Plain-text weekly digest for the founder.',
  async run(ctx) {
    const week = 7 * 24 * 60 * 60 * 1000
    const events = await ctx.readJson<Event[]>('events.json', [])
    const subs = await ctx.readJson<unknown[]>('subscribers.json', [])
    const recent = events.filter((e) => ctx.now.getTime() - Date.parse(e.at) <= week)
    const count = (t: string) => recent.filter((e) => e.type === t).length
    const text = [
      'Pomme weekly digest',
      `Plans generated: ${count('plan_generated')}`,
      `Paywall opens: ${count('paywall_open')}`,
      `Shares: ${count('share')}`,
      `Confirmed subscribers: ${subs.length}`,
      'Counts only include visitors who accepted analytics.',
    ].join('\n')
    const sent = ctx.sendToFounder ? await ctx.sendToFounder('Pomme weekly digest', text) : false
    return { ok: true, summary: sent ? 'Digest sent.' : 'Digest composed (not emailed).', data: { text } }
  },
}
