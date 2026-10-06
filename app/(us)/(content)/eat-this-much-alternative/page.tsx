import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'An Eat This Much alternative without the numbers',
    description:
      'Looking for an Eat This Much alternative? What changes when the planner works from your week instead of your macros — dinners, grocery list and budget in one plan.',
    alternates: { canonical: '/eat-this-much-alternative' },
  }
}

export default function Page() {
  return (
    <Article
      title="an eat this much alternative without the numbers"
      intro="Eat This Much is a precise tool for people who think in macros. If you are here, you probably think in Tuesdays. Here is what changes when the planner starts from your week instead of your numbers."
    >
      <p>
        Automatic meal generation is a genuinely good idea. The question is what it optimises for. Macro-first planners
        build a week that adds up on paper; week-first planners build a week that happens. Most households need the
        second one.
      </p>
      <h2>What to ask of an alternative</h2>
      <ul>
        <li>Does it know that Wednesday is chaos and Sunday is free?</li>
        <li>Does the grocery list add up quantities across the whole week, in aisle order?</li>
        <li>Does it plan leftovers on purpose, or only when you remember?</li>
        <li>Can you swap a single meal without the rest of the week collapsing?</li>
        <li>Does it speak your kitchen — cups and ounces, or grams and millilitres?</li>
      </ul>
      <h2>How Pomme differs</h2>
      <p>
        You describe your week in one sentence and Pomme plans around its shape — the busy nights, the nights off, the
        budget you set. There is no calorie counting and no macro targets, because dinner is not a spreadsheet. What you
        get instead is a week of real recipes, a shop written in the order you walk it, and swaps that keep the plan
        whole when Thursday changes.
      </p>
      <p>
        Coming from another app? Our takes on the{' '}
        <Link href="/mealime-alternative">Mealime alternative</Link> and the{' '}
        <Link href="/platejoy-alternative">Platejoy alternative</Link> cover the same questions from their angles.
      </p>
      <h2>What Pomme does not do</h2>
      <p>
        No weigh-ins, no nutrient targets, no health claims. If you are managing a medical condition or a prescribed
        diet, a registered dietitian is the right tool — not a meal planner, ours included. Pomme is for the thing most
        of us actually need: dinner, sorted, before the week asks.
      </p>
      <p>
        If you are comparing broadly, our <Link href="/best-sunday-meal-planner-2026">2026 guide to Sunday meal
        planners</Link> lays out what to look for — including what only matters once you have used a planner for a
        month.
      </p>
    </Article>
  )
}
