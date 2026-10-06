import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'A weekly meal planner with the grocery list built in',
    description:
      'What a weekly meal planner with a grocery list should actually do — real quantities, aisle order, leftovers planned in — and how Pomme turns one sentence into a week of dinners and one shop.',
    alternates: { canonical: '/weekly-meal-planner-with-grocery-list' },
  }
}

export default function Page() {
  return (
    <Article
      title="a weekly meal planner with the grocery list built in"
      intro="A plan without a list just moves the problem to the shop. Here is what a weekly meal planner should do once the dinners are chosen — and why the grocery list is where most apps give up."
    >
      <p>
        Planning the week is the easy half. The half that decides whether you actually cook on Wednesday is the list: what
        to buy, how much, and in what order to walk the shop so you are not doubling back for lemons you passed twice.
      </p>
      <h2>Quantities that add up across the week</h2>
      <p>
        Two recipes need onions. One wants 200 g of carrots, another 300 g. A useful planner does not print two onion
        lines — it adds them up, keeps grams and litres together, and never quietly turns five hundred grams into five
        bags. That single behaviour is the difference between a list and a real shop.
      </p>
      <h2>A list in the order you walk the shop</h2>
      <p>
        Produce first, then the aisles you know, then the things that live at the back. A list sorted by aisle means you
        read it once and put your phone away. No hovering in front of the tinned tomatoes wondering what you missed.
      </p>
      <h2>Leftovers are part of the plan</h2>
      <p>
        The cheapest dinner of the week is the one you already cooked. A planner worth having builds leftovers in on
        purpose — a bigger batch on Sunday that becomes Monday — instead of leaving them to chance and the bin.
      </p>
      <h2>What Pomme does with it</h2>
      <p>
        You describe your week in one sentence — busy week, two of us, veggie Wednesday. Pomme builds seven dinners
        around the shape you gave her, then writes the grocery list with quantities already summed, sorted by aisle, in
        US cups and ounces or British grams and millilitres. Night off? Mark it, and the list updates with it.
      </p>
      <p>
        If you are still choosing a planner, our <Link href="/best-sunday-meal-planner-2026">guide to picking a Sunday
        meal planner</Link> walks through what to look for. And if you are watching the food budget this month,{' '}
        <Link href="/meal-plan-on-a-budget">meal planning on a budget</Link> is the natural next step.
      </p>
    </Article>
  )
}
