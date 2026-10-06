import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'How to meal plan on a budget that actually holds',
    description:
      'Meal planning on a budget: set a weekly number, reuse ingredients across meals, plan leftovers on purpose, and make the plan bend before the till does.',
    alternates: { canonical: '/meal-plan-on-a-budget' },
  }
}

export default function Page() {
  return (
    <Article
      title="how to meal plan on a budget that actually holds"
      intro="A food budget rarely fails at the till. It fails on Thursday, when the plan runs out and the takeaway wins. Here is how to plan a week of dinners that bends instead of breaking."
    >
      <p>
        Budget meal planning is not about finding the cheapest recipes on the internet. It is about deciding the week&apos;s
        number before the week starts, and letting every dinner after that answer to it.
      </p>
      <h2>Set the number first</h2>
      <p>
        Decide what the week of food can cost — one figure, for the household. The plan then has a job: fit inside it. A
        plan that starts with recipes and ends with a surprise at the till is just shopping with extra steps.
      </p>
      <h2>Ingredients that work twice</h2>
      <ul>
        <li>Roast a tray of vegetables on Sunday and they are a side, a sauce base and a lunch.</li>
        <li>Cook one pot slightly too big; the second night is free.</li>
        <li>Choose recipes that share ingredients, so half a bunch of coriander never dies in the drawer.</li>
        <li>Mince, beans and eggs are the honest budget of every kitchen — plan with them, not around them.</li>
      </ul>
      <h2>One list, one shop</h2>
      <p>
        Every extra trip costs money you did not plan to spend. A single list — quantities summed, sorted by aisle — is a
        budgeting tool as much as a cooking one. This is the part a{' '}
        <Link href="/weekly-meal-planner-with-grocery-list">weekly planner with a built-in list</Link> quietly does best.
      </p>
      <h2>Let the plan bend, not break</h2>
      <p>
        When the week goes sideways, swap a meal rather than abandoning the plan. A swap keeps the list and the budget
        intact; a cancelled plan becomes three unplanned shops. If the money is genuinely tight this month,{' '}
        <Link href="/how-to-reduce-food-waste">cutting what your bin sees</Link> is usually worth more than hunting for
        cheaper recipes.
      </p>
      <p>
        Pomme takes a weekly number and plans around it — dinners, list and budget together — and when a week runs over,
        the swaps she suggests are the cheaper ones first. No scorecards, no diet maths. Just dinner that fits the week
        you can afford.
      </p>
    </Article>
  )
}
