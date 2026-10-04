import type { Metadata } from 'next'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'A PlateJoy alternative that plans your whole week',
    description: 'Comparing weekly meal planners? Here is what matters when you move on from PlateJoy, and how Pomme plans dinners, groceries and budget.',
    alternates: { canonical: '/platejoy-alternative' },
  }
}

export default function Page() {
  return (
    <Article
      title="a platejoy alternative that plans your whole week"
      intro="Choosing a new meal planner is mostly about one thing: will you still use it in week six? Here is how to judge, and what Pomme offers."
    >
      <p>
        Meal planners tend to fail in the same quiet way. The first week feels great, then life gets in the way, the plan
        stops matching reality, and the app goes unopened. A good replacement is one that bends with your week.
      </p>
      <h2>Questions to ask before you switch</h2>
      <ul>
        <li>How long does it take to get a plan? One minute is a good target.</li>
        <li>Can you change one night without rebuilding the week?</li>
        <li>Does the shopping list combine ingredients and follow aisle order?</li>
        <li>Does it work in your local units, prices and vocabulary?</li>
        <li>Is it honest about cost, including what is free?</li>
      </ul>
      <h2>Where Pomme fits</h2>
      <p>
        Pomme starts with a sentence rather than a questionnaire. You say how the week looks, and she turns it into
        dinners, a list and a budget. Each Sunday she gets a little better at guessing what suits your household.
      </p>
      <p>
        You can try the Sunday Plan free, with no account. Plus pricing is shown as a preview while Pomme prepares to
        launch, and nothing is charged today.
      </p>
      <h2>Food without the scorecard</h2>
      <p>
        Pomme does not count calories or ask you to weigh yourself. It plans dinner. That is the whole job, and doing it
        calmly is the point.
      </p>
    </Article>
  )
}
