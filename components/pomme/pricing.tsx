'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLUS_FEATURES, PRICES, annualSaving, priceLabel } from '@/lib/pomme/content'
import { LocaleToggle } from './locale-toggle'
import { usePomme } from './pomme-provider'

const FREE_FEATURES = [
  'Sunday Plans, as many as you like',
  'The full recipe library, with steps and quantities',
  'Grocery list with real quantities, sorted by aisle',
  'One free swap a week',
  'Your weeks saved on this device',
]

function FeatureList({ items, tone }: { items: string[]; tone: 'light' | 'dark' }) {
  return (
    <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <Check
            className={cn('mt-0.5 size-4 shrink-0', tone === 'dark' ? 'text-leaf' : 'text-leaf-deep')}
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function Pricing() {
  const { locale, openPaywall } = usePomme()
  const price = PRICES[locale]
  const perMonth = priceLabel(Math.floor((price.annual / 12) * 100) / 100, locale)

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-16 bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-apple">Pricing</p>
            <h2
              id="pricing-title"
              className="mt-3 text-balance text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl"
            >
              The price isn’t the product.
            </h2>
            <p className="mt-2 pl-2 font-script text-5xl text-leaf-deep sm:text-6xl">the feeling is.</p>
          </div>
          <div className="self-start sm:self-end">
            <LocaleToggle />
          </div>
        </div>

        <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-3">
          <article className="flex flex-col rounded-3xl border border-border bg-card p-7">
            <h3 className="text-lg font-extrabold">Free</h3>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tight">{price.symbol}0</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">A proper taste of Sunday, sorted.</p>
            <FeatureList items={FREE_FEATURES} tone="light" />
            <a
              href="#sunday-plan"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-foreground/15 font-bold transition hover:border-foreground/40 mt-8"
            >
              Start free
            </a>
          </article>

          <article className="flex flex-col rounded-3xl border border-border bg-card p-7">
            <h3 className="text-lg font-extrabold">Pomme Plus</h3>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tight">{priceLabel(price.monthly, locale)}</span>
              <span className="text-muted-foreground">/month</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Everything, billed monthly.</p>
            <FeatureList items={PLUS_FEATURES} tone="light" />
            <button
              type="button"
              onClick={() => openPaywall('pricing')}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-foreground font-bold text-cream transition hover:bg-foreground/90 mt-8"
            >
              Try 7 days free
            </button>
          </article>

          <article className="relative flex flex-col overflow-hidden rounded-3xl bg-oxblood p-7 text-cream shadow-[0_30px_60px_-30px_rgba(74,14,22,0.8)] ring-2 ring-apple">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(70%_50%_at_100%_0%,#5a1019_0%,transparent_70%)]"
            />
            <div className="relative flex flex-1 flex-col">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-extrabold">Pomme Annual</h3>
                <span className="rounded-full bg-apple px-3 py-1 text-xs font-bold">
                  Save {annualSaving(locale)}%
                </span>
              </div>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tight">{priceLabel(price.annual, locale)}</span>
                <span className="text-cream/60">/year</span>
              </p>
              <p className="mt-2 text-sm text-cream/70">That’s {perMonth} a month. Less than {locale === 'uk' ? 'a takeaway coffee' : 'one oat latte'}.</p>
              <FeatureList
                items={[
                  'Everything in Pomme Plus',
                  'Founding member price, locked in',
                  'Seasonal reset plans, four times a year',
                  'Your year in food, as a keepsake',
                ]}
                tone="dark"
              />
              <button
                type="button"
                onClick={() => openPaywall('pricing')}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-apple font-bold text-primary-foreground transition hover:brightness-110 mt-8"
              >
                Start my free week
              </button>
            </div>
          </article>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Cancel anytime in two taps. Your free plan stays yours either way.
        </p>
      </div>
    </section>
  )
}
