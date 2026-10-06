import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'The Sunday reset routine that is really just dinner',
    description:
      'What a Sunday reset routine is actually for — fewer decisions, one shop, a calmer week — and the ten-minute version that covers dinner, the groceries and the budget in one go.',
    alternates: { canonical: '/sunday-reset-routine' },
  }
}

export default function Page() {
  return (
    <Article
      title="the sunday reset routine that is really just dinner"
      intro="Somewhere along the way, the Sunday reset became an aesthetic. Candles, a clean desk, a colour-coded week. The useful version is smaller, older and much less photogenic: decide the dinners, shop once, start Monday without a question."
    >
      <p>
        A reset routine earns its place only if the week that follows is lighter. Everything else is Sunday entertainment.
        Here is the part that passes the test.
      </p>
      <h2>The ten-minute reset</h2>
      <ul>
        <li>Look at the week — the late nights, the nights off, who is around for dinner.</li>
        <li>Decide the seven dinners, or however many are real. Two-minute decisions, not ambitions.</li>
        <li>Write the list from the plan. One list. One shop.</li>
        <li>Note the number the week can spend on food — and let the plan respect it.</li>
      </ul>
      <p>
        That is the whole ceremony. The candles are optional; the ten minutes are not. If you want the version that starts
        from scratch, our <Link href="/meal-planning-for-beginners">beginner&apos;s guide to meal planning</Link> walks
        through the first week.
      </p>
      <h2>Why dinner is the right centrepiece</h2>
      <p>
        Dinner is the decision that repeats, the shop that costs the most, and the habit everyone at home can feel. A
        reset that sorts dinner sorts the week&apos;s hardest question before it is asked. Laundry can wait until
        Wednesday; Tuesday at seven cannot.
      </p>
      <h2>Make the reset repeatable</h2>
      <p>
        The best routine is the one that survives a bad Sunday. Keep it small enough to do tired. Keep it in one place —
        the plan, the list and the budget belong together, not scattered across notes, apps and memory. And keep it kind:
        a reset is a fresh start, not a scorecard of what you ate last week.
      </p>
      <p>
        Pomme is built to be that one place: describe the week in a sentence, get the dinners and the shop back, and let
        the plan follow you into next Sunday. If the budget is the stressful part this month,{' '}
        <Link href="/meal-plan-on-a-budget">plan the week around a number</Link> — it is the quietest ten minutes you
        will spend all weekend.
      </p>
    </Article>
  )
}
