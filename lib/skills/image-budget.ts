import type { Skill } from './types'

const LIMIT = 200 * 1024

export const imageBudgetSkill: Skill = {
  name: 'image-budget',
  description: 'Flags recipe images over 200 KB.',
  async run(ctx) {
    const files = await ctx.listFiles('public/images/recipes')
    const over = files.filter((f) => f.bytes > LIMIT)
    return {
      ok: over.length === 0,
      summary: over.length ? `${over.length} image(s) over 200 KB: ${over.map((f) => f.name).join(', ')}` : 'All recipe images are within budget.',
      data: { over },
    }
  },
}
