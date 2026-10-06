import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Meal prep vs meal planning: only one needs a Sunday afternoon',
    description:
      'Meal prep vs meal planning, honestly: what each one costs, what each one saves, and why planning the week does more for your evenings than a fridge full of identical boxes.',
    alternates: { canonical: '/meal-prep-vs-meal-planning' },
  }
}

export default function Page() {
  return (
    <Article
      title="meal prep vs meal planning: only one needs a sunday afternoon"
      intro="They get confused constantly, and the difference decides your Sundays. Meal prep is cooking ahead. Meal planning is deciding ahead. One of them fits in ten minutes."
    >
      <h2>What meal prep actually asks</h2>
      <ul>
        <li>A block of two to four hours, usually Sunday.</li>
        <li>Twelve containers and a fridge that can hold them.</li>
        <li>A tolerance for eating the same thing at day four that you loved at day one.</li>
      </ul>
      <p>
        For some households this is a joy and a ritual. For most, it is the thing that quietly stops happening by
        February — and the containers stay as a reminder.
      </p>
      <h2>What meal planning actually asks</h2>
      <ul>
        <li>Ten minutes and a look at the week.</li>
        <li>Seven decisions, made once.</li>
        <li>One list, one shop, and no question at six o&apos;clock.</li>
      </ul>
      <p>
        Planning does not fill your fridge with boxes; it fills your week with certainty. And when a night changes — it
        will — a plan swaps one dinner. Prep has no swap; it has Thursday&apos;s container.
      </p>
      <h2>They compose, if you want both</h2>
      <p>
        Plan the week first, then prep the one element worth cooking ahead: the Sunday roast, the tray of vegetables, the
        pot of grains. Prepping without planning is cooking without a destination. Our{' '}
        <Link href="/meal-planning-for-beginners">beginner&apos;s guide</Link> covers the planning half in one page.
      </p>
      <p>
        Pomme is built for the ten-minute side: describe the week, receive the dinners and the shop, keep the plan on
        every device. What you do with your Sunday afternoon afterwards is entirely your business.
      </p>
    </Article>
  )
}
