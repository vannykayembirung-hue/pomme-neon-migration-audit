import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'How to reduce food waste, one week at a time',
    description:
      'How to reduce food waste at home without becoming a project: plan leftovers on purpose, shop one list, buy the ugly veg, and use what you already have.',
    alternates: { canonical: '/how-to-reduce-food-waste' },
  }
}

export default function Page() {
  return (
    <Article
      title="how to reduce food waste, one week at a time"
      intro="The food your bin sees is money you already spent. Cutting it is one of the few household wins that is good for the budget, the week and the planet at once — and it starts with the plan, not the compost."
    >
      <p>
        Most household food waste is not carelessness. It is the gap between the week you imagined on Saturday and the
        week you actually had. Close that gap and the bin gets lighter on its own.
      </p>
      <h2>Plan the leftovers on purpose</h2>
      <ul>
        <li>Cook one meal slightly too big and assign its second life before it exists: Sunday roast, Monday sandwiches.</li>
        <li>Choose recipes that share ingredients, so the half bunch of herbs becomes the next dinner, not a science experiment.</li>
        <li>Give the oldest thing in the fridge the first slot in the plan — the plan serves the fridge, not the other way around.</li>
      </ul>
      <h2>Shop the list, not the mood</h2>
      <p>
        One list for one shop is a waste policy as much as a budgeting one. Everything that enters the kitchen without a
        plan tends to leave it via the bin. A{' '}
        <Link href="/weekly-meal-planner-with-grocery-list">weekly planner with the grocery list built in</Link> keeps
        the two halves of the problem in the same place — and sums the quantities so you buy the 500 g you need, not the
        kilo that was on offer.
      </p>
      <h2>Buy the ugly vegetables</h2>
      <p>
        The crooked carrot and the bruised apple are the same dinner. Choosing them — and cooking the slightly sad things
        first — is the least effortful waste reduction there is. If the budget is the pressure this month,{' '}
        <Link href="/meal-plan-on-a-budget">planning the week around a number</Link> and cutting waste are the same
        strategy viewed from two sides.
      </p>
      <h2>Keep the score small</h2>
      <p>
        Do not measure everything. Watch the bin once a week — what is in it tells you what to change in next Sunday&apos;s
        plan. Two months of that and your shopping list starts looking like your household instead of a recipe website.
      </p>
    </Article>
  )
}
