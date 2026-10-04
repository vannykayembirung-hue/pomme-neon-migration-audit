import type { Metadata } from 'next'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'A Mealime alternative for a calmer week',
    description: 'Looking for a Mealime alternative? What to look for in a weekly meal planner, and how Pomme approaches dinner, the shop and the budget.',
    alternates: { canonical: '/mealime-alternative' },
  }
}

export default function Page() {
  return (
    <Article
      title="a mealime alternative for a calmer week"
      intro="If you used Mealime and you are looking for somewhere new to plan your dinners, here is what is worth asking of any weekly meal planner, and where Pomme fits."
    >
      <p>
        Most people do not need more recipes. They need the decision made. By Sunday evening the question is not what could
        I cook, it is what are we eating on Tuesday, and what do I need to buy so that it actually happens.
      </p>
      <h2>What to look for in a replacement</h2>
      <ul>
        <li>A plan that fits the real shape of your week, including the nights you are out and the nights you have ten minutes.</li>
        <li>A grocery list grouped by aisle, with quantities already added up across recipes.</li>
        <li>A budget you set, rather than one you discover at the till.</li>
        <li>Portions for your household, whether that is one, two or a family of five.</li>
        <li>No pressure around dieting. Food planning should make the week easier, not turn into a scorecard.</li>
      </ul>
      <h2>How Pomme works</h2>
      <p>
        You write one sentence about your week, something like busy week, two of us, a veggie Wednesday. Pomme reads it,
        builds seven days of dinners around it, and writes the grocery list in the order you walk the shop. Leftovers are
        planned in on purpose, and you can mark any night as a night off.
      </p>
      <p>
        Pomme works in US dollars and ounces, or British pounds and metric, with the vocabulary to match. Courgette or
        zucchini, coriander or cilantro, it says what you say.
      </p>
      <h2>What Pomme does not do</h2>
      <p>
        There is no calorie counting, no weigh-ins and no health claims. Pomme is about getting dinner sorted. If you need
        medical or dietetic advice, a registered professional is the right person to ask.
      </p>
      <h2>Bringing your habits with you</h2>
      <p>
        Your plan is saved on your own device, so it is there when you come back next Sunday. Pomme learns your rhythm week
        by week, so the plans get closer to how you actually eat.
      </p>
    </Article>
  )
}
