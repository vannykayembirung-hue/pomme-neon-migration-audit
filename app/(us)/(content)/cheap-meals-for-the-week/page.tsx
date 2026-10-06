import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Cheap meals for the week: a plan, not a hunt',
    description:
      'Cheap meals for the week — not a list of recipes to scroll, but a way to plan seven dinners around a number: shared ingredients, planned leftovers, one shop.',
    alternates: { canonical: '/cheap-meals-for-the-week' },
  }
}

export default function Page() {
  return (
    <Article
      title="cheap meals for the week: a plan, not a hunt"
      intro="Searching for cheap meals is how expensive weeks start. Three cheap recipes you did not plan around become one expensive shop. The cheaper hunt is the plan."
    >
      <p>
        A cheap week of dinners is an architecture, not a collection of bargains. Beans are cheap; a rogue jar of
        harissa you use once is not. Here is the architecture that holds.
      </p>
      <h2>Build the week around cheap repeats</h2>
      <ul>
        <li>Eggs, beans, lentils, mince and pasta are the honest floor of most kitchens — plan with them at the centre.</li>
        <li>One roast, two lives: the tray of vegetables you roast on Sunday is sauce, side and lunchbox by Tuesday.</li>
        <li>Herbs and spices are cheap per meal only when the next meal uses them too.</li>
        <li>Meat stretches as a flavour, not a portion: a little pancetta does the work of a lot of chicken.</li>
      </ul>
      <h2>Set the number before the recipes</h2>
      <p>
        Decide what the week can spend, then let every dinner answer to it. This inverts the usual order — recipes first,
        bill at the till — and it is the single habit that changes the number on the receipt. Our full guide to{' '}
        <Link href="/meal-plan-on-a-budget">meal planning on a budget</Link> walks through it week by week.
      </p>
      <h2>One list, one shop, no rescue trips</h2>
      <p>
        Every unplanned visit to the shop costs a little more than the one before it. A single list — quantities summed
        across the week, sorted by aisle — is a price control as much as a memory aid. That is exactly what a{' '}
        <Link href="/weekly-meal-planner-with-grocery-list">weekly planner with the grocery list built in</Link> keeps
        honest.
      </p>
      <p>
        Or hand the whole problem over: tell Pomme the number the week can spend and she plans the dinners, the leftovers
        and the shop around it. Cheap meals, chosen once, on a Sunday.
      </p>
    </Article>
  )
}
