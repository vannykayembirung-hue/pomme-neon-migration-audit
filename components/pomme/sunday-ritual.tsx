import {
  Bookmark,
  CalendarHeart,
  Leaf,
  Repeat,
  ShoppingBasket,
  Timer,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

const PILLARS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: CalendarHeart,
    title: 'Your Week',
    body: 'Dinners that fit the week you actually have, not the one you wish you had.',
  },
  {
    icon: ShoppingBasket,
    title: 'Your Basket',
    body: 'One list, sorted by aisle. Ingredients shared across meals, so nothing wilts at the back of the fridge.',
  },
  {
    icon: Timer,
    title: 'Your Time',
    body: 'Fifteen minutes on a Tuesday. Something slower on a Sunday. Pomme plans the difference.',
  },
  {
    icon: Wallet,
    title: 'Your Budget',
    body: 'Set a number. Pomme builds the shop around it and tells you what you saved.',
  },
  {
    icon: Leaf,
    title: 'Your Mood',
    body: 'Feeling cosy, fresh or completely done? Say so, and the plan shifts with you.',
  },
  {
    icon: Bookmark,
    title: 'Your Saves',
    body: 'Every meal you love is kept automatically. Your own cookbook, quietly writing itself.',
  },
]

export function SundayRitual() {
  return (
    <section id="how-it-works" aria-labelledby="ritual-title" className="bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-apple">Every Sunday at six</p>
          <h2
            id="ritual-title"
            className="mt-3 text-balance text-4xl font-black leading-[0.95] tracking-[-0.04em] text-foreground sm:text-6xl"
          >
            One plan. Seven little reliefs.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            You get one calm, beautiful plan for the week ahead. It isn’t another feed to scroll or another list to
            keep up with. It just takes care of the boring bits.
          </p>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="group rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(74,14,22,0.45)]"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-secondary text-apple transition group-hover:bg-apple group-hover:text-primary-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-extrabold tracking-tight">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
          <li className="relative overflow-hidden rounded-3xl bg-oxblood p-6 text-cream sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-leaf text-oxblood">
                  <Repeat className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">Your Pattern</h3>
                  <p className="mt-2 max-w-xl leading-relaxed text-cream/75">
                    The seventh one is the reason people stay. Learning your rhythm week by week — and planning around
                    it before you even ask — is coming to Pomme Plus.
                  </p>
                </div>
              </div>
              <p className="font-script text-5xl text-leaf sm:text-6xl">she’ll learn.</p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  )
}
