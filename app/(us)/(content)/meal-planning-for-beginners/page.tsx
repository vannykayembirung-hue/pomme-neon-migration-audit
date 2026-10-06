import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Meal planning for beginners: start smaller than you think',
    description:
      'Meal planning for beginners, without the spreadsheet. Plan one week of dinners in ten minutes, skip what does not matter, and keep the habit past week two.',
    alternates: { canonical: '/meal-planning-for-beginners' },
  }
}

export default function Page() {
  return (
    <Article
      title="meal planning for beginners: start smaller than you think"
      intro="Most meal planning advice is for people who already meal plan. This is the version for the rest of us: one week, ten minutes, no spreadsheet, no colour-coded recipe binder."
    >
      <p>
        The goal of meal planning is not organisation as a hobby. It is opening the fridge on Wednesday night and knowing
        what is for dinner before anyone asks. Everything else is optional.
      </p>
      <h2>Plan the week you actually have</h2>
      <ul>
        <li>Look at the week first. Late shifts, football practice, a night out — plan around them, not through them.</li>
        <li>Give the busy nights something fast, and give yourself permission for a night off. Frozen pizza is a plan.</li>
        <li>Choose three or four dinners you like and repeat them. Rotation beats novelty on a Tuesday.</li>
        <li>Write the list from the plan — not from memory, and not from the recipe you might make on Thursday.</li>
      </ul>
      <h2>The ten-minute Sunday version</h2>
      <p>
        Set a timer. Note how the week looks. Pick the dinners — a couple of old favourites, one thing you fancied, one
        deliberately easy night. Write what the meals need that is not already in the kitchen. Done. The first week will
        be rough around the edges; by week three it is the calmest ten minutes of your Sunday.
      </p>
      <h2>What to skip (and not feel bad about)</h2>
      <p>
        Batch-cooking Sundays. Instagram-ready meal prep containers. Calorie maths, unless that is genuinely your thing.
        Diet rules dressed up as planning. None of these are meal planning — they are separate hobbies that borrow its
        vocabulary. A <Link href="/weekly-meal-planner-with-grocery-list">weekly planner with the grocery list built
        in</Link> already covers the part that matters.
      </p>
      <h2>Let something help</h2>
      <p>
        If ten minutes with a pen is still ten minutes you do not have, hand it over. Tell Pomme how the week looks and
        she returns seven dinners and the shop for them — and the plan stays on your device for next Sunday. It is the
        beginner&apos;s shortcut with nothing to set up: no accounts to configure, no recipe database to curate.
      </p>
      <p>
        And when the habit sticks, the same ten minutes turn into a proper rhythm — <Link href="/sunday-reset-routine">a
        Sunday reset</Link> that covers dinner, the groceries and the budget in one go.
      </p>
    </Article>
  )
}
