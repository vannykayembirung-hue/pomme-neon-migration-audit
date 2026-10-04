import type { Skill } from './types'

export const orphanCaptureSkill: Skill = {
  name: 'orphan-capture',
  description: 'Drafts (never posts) a disclosed, helpful Reddit comment for people looking for a Mealime alternative.',
  async run(ctx) {
    if (!ctx.flags.orphanCapture) return { ok: true, summary: 'Orphan capture is switched off.' }
    const date = ctx.now.toISOString().slice(0, 10)
    const draft = [
      `# Draft for review, ${date}`,
      '',
      'Thread: someone asking for a Mealime alternative.',
      '',
      'Suggested comment (edit before posting, and check the subreddit rules on self-promotion):',
      '',
      "I'm building Pomme, so I'm biased. It plans dinners and writes the grocery list from a short note about your week, with no calorie counting. It's free to try at the link in my profile. Happy to say what I'd look for in any planner if that's more useful.",
    ].join('\n')
    await ctx.writeText(`drafts/reddit-${date}.md`, draft)
    return { ok: true, summary: `Draft saved to drafts/reddit-${date}.md for human review.` }
  },
}
