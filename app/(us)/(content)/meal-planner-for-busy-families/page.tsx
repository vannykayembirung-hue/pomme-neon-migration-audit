import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'A meal planner for busy families (and tired evenings)',
    description:
      'Family meal planning for full weeks: quick nights where they belong, leftovers on purpose, one shop for everyone. How Pomme plans dinners around the real shape of a family week.',
    alternates: { canonical: '/meal-planner-for-busy-families' },
  }
}

export default function Page() {
  return (
    <Article
      title="a meal planner for busy families (and tired evenings)"
      intro="A family week is not seven equal days. It has a frantic Tuesday, a night out, a night nobody can cook, and someone who will only eat the pasta. The plan should know that before you do."
    >
      <p>
        Family meal planning fails when it pretends every evening is the same. It succeeds when it plans the shape of the
        week you actually have — and quietly does the thinking on Sunday so nobody has to do it at six on Wednesday.
      </p>
      <h2>Plan the week&apos;s shape, not just its recipes</h2>
      <ul>
        <li>Put the fast dinners on the late nights, and the slow ones on the day somebody is home early.</li>
        <li>Mark a night off now and then. A planned takeaway beats an unplanned one, in money and in mood.</li>
        <li>Cook the favourite once and expect it twice — most families eat in rotation anyway.</li>
        <li>Let the plan feed the lunchboxes. A bigger Sunday roast is Monday&apos;s sandwiches.</li>
      </ul>
      <h2>One shop, one list, fewer questions</h2>
      <p>
        The mental load of a family kitchen is not the cooking. It is the asking, the checking, the running back for milk.
        A grocery list with real quantities, in aisle order and summed across the week, removes most of it. That is the
        part of a <Link href="/weekly-meal-planner-with-grocery-list">weekly planner with a grocery list</Link> that
        parents tell us they feel first — the silence, not the software.
      </p>
      <h2>The budget is part of the family plan</h2>
      <p>
        Feeding a family is a weekly number whether or not you write it down. Planning around it — rather than discovering
        it at the till — is the least dramatic way to spend less. Our guide to{' '}
        <Link href="/meal-plan-on-a-budget">meal planning on a budget</Link> covers the habits that hold up at scale.
      </p>
      <h2>How Pomme handles a real family week</h2>
      <p>
        Tell her how the week looks — say, busy week, four of us, quick Wednesdays, someone who hates fish. She plans
        seven dinners around it, portions for your household, with leftovers built in and the shop written in the order
        you walk it. The plan stays on your device and comes back on every screen in the kitchen. And when the week
        changes — it will — swapping one dinner keeps the rest of the plan exactly where it was.
      </p>
    </Article>
  )
}
