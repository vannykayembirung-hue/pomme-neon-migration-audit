import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Mealime vs Platejoy: what actually differs',
    description:
      'Mealime vs Platejoy, honestly: what each does best, what a week in each feels like, and the third option — a planner that starts from your week and sets the budget.',
    alternates: { canonical: '/mealime-vs-platejoy' },
  }
}

export default function Page() {
  return (
    <Article
      title="mealime vs platejoy: what actually differs"
      intro="Both will get you fed. The difference is where the work goes — and who does it. Here is the honest comparison, plus the question neither app asks out loud: what should the week cost?"
    >
      <h2>Mealime, in one paragraph</h2>
      <p>
        Mealime is fast and tidy: pick recipes, get a clean list, cook. Its strength is friction-free selection from a
        polished library. Its limit is that the choosing is still yours — every Sunday, again. For a comparison from the
        other side, our <Link href="/mealime-alternative">Mealime alternative</Link> page goes deeper.
      </p>
      <h2>Platejoy, in one paragraph</h2>
      <p>
        Platejoy personalises harder: preferences, household, diet filters, and a grocery list pushed to shopping apps.
        The depth is real, and so is the setup — and the price sits at the top of the market. More on that in our{' '}
        <Link href="/platejoy-alternative">Platejoy alternative</Link> take.
      </p>
      <h2>The questions that decide it</h2>
      <ul>
        <li>Do you want to choose dinners, or have them chosen around your week?</li>
        <li>Does the list total up quantities across the whole week, aisle by aisle?</li>
        <li>Is there a budget — a number the plan respects — or only a price tag on the app itself?</li>
        <li>Can one swap change one night without rebuilding the rest?</li>
      </ul>
      <h2>The third option</h2>
      <p>
        Pomme starts from your week, not a catalogue: one sentence in, seven dinners and the shop out — with leftovers
        planned, a weekly number respected, and swaps that keep the plan whole. It is priced below both — the{' '}
        <Link href="/best-sunday-meal-planner-2026">2026 planner guide</Link> places it against the field — and the free
        plan is a proper plan, not a demo. If none of the three feel right, that guide is the better place to start.
      </p>
    </Article>
  )
}
