import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'A Paprika app alternative that plans the week with you',
    description:
      'Looking for a Paprika app alternative? Paprika keeps your recipes; Pomme decides the week, writes the grocery list and keeps the budget. What changes when the app plans instead of stores.',
    alternates: { canonical: '/paprika-app-alternative' },
  }
}

export default function Page() {
  return (
    <Article
      title="a paprika app alternative that plans the week with you"
      intro="Paprika is an excellent recipe box. The question is whether a recipe box is what your Sunday needs. Here is what changes when the app decides the week instead of waiting for you to."
    >
      <p>
        Recipe managers solve collection: everything you have ever saved, in one searchable place. Most households do not
        have a collection problem. They have a decision problem — seven of them, every week, usually around six o&apos;clock.
      </p>
      <h2>What a Paprika alternative should add</h2>
      <ul>
        <li>A week of dinners planned from the shape of your week, not from a scroll through your saved recipes.</li>
        <li>A grocery list where the quantities are already summed across every meal.</li>
        <li>Swaps that change one night without unravelling the other six.</li>
        <li>A budget you set before the week, not one you audit afterwards.</li>
      </ul>
      <h2>Where Pomme fits</h2>
      <p>
        You describe the week in a sentence — busy week, two of us, veggie Wednesday — and Pomme returns seven dinners
        and the shop for them. There is nothing to import, organise or tag. The plan stays on your device and comes back
        on every screen, and the recipes arrive in your kitchen vocabulary: cups and ounces, or grams and millilitres.
      </p>
      <p>
        If you are comparing more widely, our takes on the{' '}
        <Link href="/mealime-alternative">Mealime alternative</Link>, the{' '}
        <Link href="/platejoy-alternative">Platejoy alternative</Link> and{' '}
        <Link href="/eat-this-much-alternative">Eat This Much alternative</Link> cover the same question from their
        angles.
      </p>
      <h2>The honest boundary</h2>
      <p>
        Pomme does not store your recipe collection, and it does not read nutrition labels back to you. If your joy is
        the archive, Paprika is genuinely great at it. If your pain is the week, the list and the till — that is the part
        Pomme takes off your Sunday.
      </p>
    </Article>
  )
}
