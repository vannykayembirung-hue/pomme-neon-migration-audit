import type { Metadata } from 'next'
import Link from 'next/link'
import { Article } from '@/components/content/article'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Dinner ideas for the week, already shopped',
    description:
      'Dinner ideas for the week that come with the shopping done: how a week of dinners is built around quick nights, leftovers and real life — with examples from the Pomme kitchen.',
    alternates: { canonical: '/dinner-ideas-for-the-week' },
  }
}

export default function Page() {
  return (
    <Article
      title="dinner ideas for the week, already shopped"
      intro="Nobody needs another list of dinner ideas. You need a week that fits — quick where it must be, generous where it can be, and shopped in one trip. Here is what that looks like."
    >
      <h2>A week with a shape</h2>
      <ul>
        <li>
          <strong>Monday</strong> — something warm and fast: lemony orzo, or a soup that was Sunday&apos;s vegetables.
        </li>
        <li>
          <strong>Tuesday</strong> — the dependable favourite. Every family has one. Ours data says it is usually a
          curry, a pasta or tacos.
        </li>
        <li>
          <strong>Wednesday</strong> — ten-minute night: eggs on toast is a dinner, and it is allowed to be.
        </li>
        <li>
          <strong>Thursday</strong> — the second life: Sunday&apos;s roast, remade as a traybake or a sandwich supper.
        </li>
        <li>
          <strong>Friday</strong> — something that feels like a treat and costs like a plan: homemade pizza night, fish
          tacos, a big salad with something crispy on top.
        </li>
        <li>
          <strong>Saturday</strong> — the slow one, if anyone is home: a stew, a tray of roast squash, a curry that
          improves overnight.
        </li>
        <li>
          <strong>Sunday</strong> — the reset cook: the roast or the pot that seeds the week ahead. And a{' '}
          <Link href="/sunday-reset-routine">reset routine</Link> that takes ten minutes.
        </li>
      </ul>
      <h2>The ideas are the easy part</h2>
      <p>
        Notice that the week above works because of its architecture — quick nights in the right places, leftovers
        assigned before they exist — not because of any single recipe. That is the part worth borrowing, whichever
        recipes you fill it with. If the week needs to be cheap, the same shape applies; our{' '}
        <Link href="/cheap-meals-for-the-week">cheap meals for the week</Link> page does the maths.
      </p>
      <h2>Or let the kitchen plan itself</h2>
      <p>
        The Pomme kitchen holds a growing library of exactly this kind of food — butternut and coconut soup, baja fish
        tacos, lemony orzo — planned around your week and portioned for your table. Describe the week, get seven dinners
        and the grocery list back, and swap anything that does not fit. The ideas arrive already shopped.
      </p>
    </Article>
  )
}
