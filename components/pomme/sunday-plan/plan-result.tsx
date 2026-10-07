'use client'

import { useState } from 'react'
import { AlertTriangle, Bookmark, CalendarArrowUp, Check, Clock, Moon, RefreshCw, Repeat, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAY_NAMES, formatMoney, formatQty, type Plan } from '@/lib/pomme/plan'
import { AISLE_LABELS, localName, type Locale, type Recipe } from '@/lib/pomme/recipes'
import { usePomme } from '../pomme-provider'
import { RecipeImage } from './recipe-image'
import { RecipeView } from './recipe-view'
import { SwapPicker } from './swap-picker'

function formatMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`
}

function EmptyState() {
  return (
    <div className="relative flex h-full min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl bg-oxblood p-7 text-cream">
      <RecipeImage
        src="/images/hero-apple.webp"
        alt=""
        width={1024}
        height={1024}
        sizes="320px"
        className="pointer-events-none absolute -right-16 -top-10 w-80 opacity-90 [mask-image:radial-gradient(closest-side,black_65%,transparent)]"
      />
      <div className="relative">
        <p className="font-script text-5xl leading-none text-leaf">your plan</p>
        <h3 className="mt-1 text-3xl font-black tracking-tight">lands right here.</h3>
        <ul className="mt-6 flex flex-col gap-2 text-sm text-cream/75">
          {['Seven nights, planned around your week', 'One basket, sorted by aisle', 'A quick note on what Pomme noticed'].map(
            (item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-leaf" aria-hidden="true" />
                {item}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  )
}

function WeekList({
  plan,
  locale,
  onOpenRecipe,
  onSwapRequest,
}: {
  plan: Plan
  locale: Locale
  onOpenRecipe: (recipe: Recipe, batch: boolean) => void
  onSwapRequest: (day: number, recipe: Recipe) => void
}) {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {plan.days.map((entry) => (
        <li key={entry.day} className="flex items-center gap-4 py-3.5">
          <span className="w-9 shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {DAY_NAMES[entry.day].slice(0, 3)}
          </span>
          {entry.kind === 'off' ? (
            <>
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <Moon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Night off</p>
                <p className="text-sm text-muted-foreground">
                  {locale === 'uk' ? 'Takeaway, toast or nothing at all.' : 'Takeout, toast or nothing at all.'} It’s on
                  the plan.
                </p>
              </div>
            </>
          ) : entry.kind === 'leftovers' ? (
            <>
              <RecipeImage
                src={entry.recipe.image}
                alt=""
                width={112}
                height={112}
                sizes="56px"
                className="size-14 shrink-0 rounded-2xl object-cover opacity-70 grayscale-[30%]"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-bold">
                  <Repeat className="size-3.5 text-leaf-deep" aria-hidden="true" />
                  Leftovers
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {localName(entry.recipe.name, locale)} from {DAY_NAMES[entry.fromDay]}. Just reheat.
                </p>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenRecipe(entry.recipe, entry.batch)}
                aria-label={`View recipe: ${localName(entry.recipe.name, locale)}`}
                className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl text-left transition hover:bg-secondary/60"
              >
                <RecipeImage
                  src={entry.recipe.image}
                  alt=""
                  width={112}
                  height={112}
                  sizes="56px"
                  className="size-14 shrink-0 rounded-2xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-pretty font-bold leading-snug">{localName(entry.recipe.name, locale)}</span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {entry.recipe.time} min
                    {entry.mode === 'quick' && ' · Quick night'}
                    {entry.batch && ' · Makes extra'}
                    {entry.overTime && (
                      <span className="font-semibold text-apple"> · over your time</span>
                    )}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSwapRequest(entry.day, entry.recipe)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-foreground/40"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                <span>Swap</span>
              </button>
            </>
          )}
        </li>
      ))}
    </ol>
  )
}

function Basket({ plan, locale }: { plan: Plan; locale: Locale }) {
  // Checkboxes live in the persisted store: they survive F5 and follow the plan.
  const { checkedGroceryItems, toggleGroceryItem } = usePomme()

  return (
    <div className="flex flex-col gap-6 py-2">
      {plan.basket.map((group) => (
        <div key={group.aisle}>
          <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {AISLE_LABELS[group.aisle][locale]}
          </h4>
          <ul className="mt-2 flex flex-col">
            {group.items.map((item) => {
              const isChecked = checkedGroceryItems.includes(item.key)
              return (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2 transition hover:bg-secondary/60">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleGroceryItem(item.key)}
                      className="mt-1 size-4.5 shrink-0 accent-leaf-deep"
                    />
                    <span className="flex-1">
                      <span className={cn('flex items-baseline gap-3', isChecked && 'text-muted-foreground line-through')}>
                        <span className="flex-1">{item.label}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatQty(item.amount, item.unit)}
                        </span>
                      </span>
                      <span className={cn('mt-0.5 block text-xs text-muted-foreground', isChecked && 'line-through')}>
                        Used in {item.meals} {item.meals === 1 ? 'meal' : 'meals'}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {plan.staples.length > 0 && (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Probably already in your {locale === 'uk' ? 'cupboard' : 'pantry'}:
          </span>{' '}
          {plan.staples.map((s) => `${s.label} (${formatQty(s.amount, s.unit)})`).join(', ')}
        </p>
      )}
    </div>
  )
}

export function PlanResult() {
  const { plan, locale, prefs, openPaywall, freeSwapsLeft, swapMeal, unapplied } = usePomme()
  const [tab, setTab] = useState<'week' | 'basket'>('week')
  const [viewing, setViewing] = useState<{ recipe: Recipe; batch: boolean } | null>(null)
  const [swapTarget, setSwapTarget] = useState<{ day: number; recipe: Recipe } | null>(null)
  const [saved, setSaved] = useState(false)

  if (!plan) return <EmptyState />

  const overBudget = plan.total > plan.budget
  const itemCount = plan.basket.reduce((sum, g) => sum + g.items.length, 0)

  const handleSwapRequest = (day: number, recipe: Recipe) => {
    if (freeSwapsLeft > 0) setSwapTarget({ day, recipe })
    else openPaywall('swap')
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500" aria-live="polite">
      <div className="rounded-3xl bg-oxblood p-6 text-cream">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-script text-4xl leading-none text-leaf">your week,</p>
            <h3 className="text-2xl font-black tracking-tight">beautifully sorted.</h3>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cream/80">Free plan</span>
        </div>
        <dl className="mt-6 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3">
          <div className="rounded-2xl bg-white/[0.06] p-3">
            <dt className="text-[11px] uppercase tracking-wider text-cream/55">Dinners</dt>
            <dd className="mt-1 text-xl font-black">{plan.dinners}</dd>
          </div>
          <div className="rounded-2xl bg-white/[0.06] p-3">
            <dt className="text-[11px] uppercase tracking-wider text-cream/55">Hands-on</dt>
            <dd className="mt-1 text-xl font-black">{formatMinutes(plan.activeMinutes)}</dd>
          </div>
          <div className={cn('rounded-2xl p-3', overBudget ? 'bg-apple/25' : 'bg-white/[0.06]')}>
            <dt className="text-[11px] uppercase tracking-wider text-cream/55">Basket</dt>
            <dd className="mt-1 text-xl font-black">≈{formatMoney(plan.total, locale)}</dd>
          </div>
        </dl>
        {overBudget && (
          <button
            type="button"
            onClick={() => openPaywall('budget')}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf underline-offset-4 hover:underline"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Bring it under {formatMoney(plan.budget, locale)} with budget mode
          </button>
        )}
      </div>

      {plan.warnings.length > 0 && (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-2xl border border-apple/35 bg-apple/10 px-4 py-3.5 text-sm leading-relaxed text-oxblood"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-apple" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            {plan.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      )}

      {unapplied.length > 0 && (
        <div role="note" className="flex items-start gap-2.5 rounded-2xl border border-oxblood/30 bg-oxblood/5 px-4 py-3.5 text-sm leading-relaxed text-oxblood">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-oxblood" aria-hidden="true" />
          <p>
            I couldn&apos;t apply: {unapplied.join(', ')}. Pomme can&apos;t check those ingredients yet — read each recipe
            before you shop.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-apple">Pomme noticed</p>
        <ul className="mt-3 flex flex-col gap-2">
          {plan.notes.map((note) => (
            <li key={note} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-leaf-deep" aria-hidden="true" />
              {note}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <div role="tablist" aria-label="Plan view" className="flex gap-1 rounded-full bg-secondary p-1">
          {(
            [
              ['week', 'Your Week'],
              ['basket', `Your Basket · ${itemCount}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`panel-${value}`}
              onClick={() => setTab(value)}
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-3">
          {tab === 'week' ? (
            <WeekList plan={plan} locale={locale} onOpenRecipe={(recipe, batch) => setViewing({ recipe, batch })} onSwapRequest={handleSwapRequest} />
          ) : (
            <Basket plan={plan} locale={locale} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-apple p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-black leading-tight">Want this every Sunday?</p>
          <p className="mt-1 text-sm text-primary-foreground/85">
            Your week saves to this device as you plan. Pomme Plus adds unlimited swaps and more.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setSaved(true)}
            aria-pressed={saved}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition',
              saved ? 'bg-white/20 text-primary-foreground' : 'bg-cream text-oxblood hover:bg-white',
            )}
          >
            {saved ? <Check className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
            {saved ? 'Saved on this device' : 'Save my plan'}
          </button>
          <button
            type="button"
            onClick={() => openPaywall('next-week')}
            aria-label="Plan next week"
            className="inline-flex items-center justify-center rounded-full border border-cream/40 px-3 py-2.5 transition hover:bg-white/10"
          >
            <CalendarArrowUp className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {saved && (
        <p role="status" className="text-center text-xs text-muted-foreground">
          Your plan, basket and swaps survive a refresh on this device. Reset anytime from the footer.
        </p>
      )}

      <RecipeView
        recipe={viewing?.recipe ?? null}
        servings={plan.servings}
        batch={viewing?.batch ?? false}
        locale={locale}
        onClose={() => setViewing(null)}
      />
      <SwapPicker
        open={swapTarget !== null}
        currentRecipeId={swapTarget?.recipe.id ?? null}
        avoid={prefs.avoid}
        locale={locale}
        onPick={(recipe) => {
          if (swapTarget) swapMeal(swapTarget.day, recipe.id)
          setSwapTarget(null)
        }}
        onClose={() => setSwapTarget(null)}
      />
    </div>
  )
}
