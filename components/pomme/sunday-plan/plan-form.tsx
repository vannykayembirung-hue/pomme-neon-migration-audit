'use client'

import { Minus, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BUDGET_RANGE, DAYS, DAY_NAMES, formatMoney, type DayMode } from '@/lib/pomme/plan'
import type { Avoid, Mood } from '@/lib/pomme/recipes'
import { usePomme } from '../pomme-provider'

const NEXT_MODE: Record<DayMode, DayMode> = { cook: 'quick', quick: 'off', off: 'cook' }
const MODE_LABEL: Record<DayMode, string> = { cook: 'Cook', quick: 'Quick', off: 'Off' }
const MODE_STYLE: Record<DayMode, string> = {
  cook: 'bg-oxblood text-cream',
  quick: 'bg-apple text-primary-foreground',
  off: 'bg-secondary text-muted-foreground',
}

const MOODS: { value: Mood; label: string }[] = [
  { value: 'cosy', label: 'Cosy' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'energised', label: 'Energised' },
  { value: 'easy', label: 'Low-effort' },
]

const AVOIDS: { value: Avoid; us: string; uk: string }[] = [
  { value: 'meat', us: 'Meat', uk: 'Meat' },
  { value: 'fish', us: 'Fish', uk: 'Fish' },
  { value: 'mushroom', us: 'Mushrooms', uk: 'Mushrooms' },
  { value: 'cilantro', us: 'Cilantro', uk: 'Coriander' },
  { value: 'spicy', us: 'Anything spicy', uk: 'Anything spicy' },
  { value: 'dairy', us: 'Dairy', uk: 'Dairy' },
]

const chip = (active: boolean) =>
  cn(
    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
    active
      ? 'border-foreground bg-foreground text-cream'
      : 'border-border bg-card text-foreground hover:border-foreground/40',
  )

function Field({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-bold">{legend}</legend>
      {hint && <p className="-mt-2 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  )
}

export function PlanForm() {
  const { prefs, setPrefs, locale, generate, plan } = usePomme()
  const range = BUDGET_RANGE[locale]

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        generate()
      }}
      className="flex flex-col gap-7 rounded-3xl border border-border bg-card p-5 sm:p-7"
    >
      <Field legend="Your week" hint="Tap a day to switch between cook, quick and night off.">
        <div className="grid grid-cols-7 gap-1.5">
          {prefs.days.map((mode, index) => (
            <button
              key={DAYS[index]}
              type="button"
              aria-label={`${DAY_NAMES[index]}: ${MODE_LABEL[mode]}. Tap to change.`}
              onClick={() =>
                setPrefs((p) => ({
                  ...p,
                  days: p.days.map((d, i) => (i === index ? NEXT_MODE[d] : d)),
                }))
              }
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl py-2.5 transition active:scale-95',
                MODE_STYLE[mode],
              )}
            >
              <span className="text-xs font-bold">{DAYS[index]}</span>
              <span className="text-[10px] font-medium opacity-80">{MODE_LABEL[mode]}</span>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
        <Field legend="Who’s eating?">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Fewer people"
              disabled={prefs.household <= 1}
              onClick={() => setPrefs((p) => ({ ...p, household: Math.max(1, p.household - 1) }))}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border transition hover:border-foreground/40 disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <output aria-live="polite" className="min-w-16 text-center text-lg font-bold">
              {prefs.household} {prefs.household === 1 ? 'person' : 'people'}
            </output>
            <button
              type="button"
              aria-label="More people"
              disabled={prefs.household >= 6}
              onClick={() => setPrefs((p) => ({ ...p, household: Math.min(6, p.household + 1) }))}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border transition hover:border-foreground/40 disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        </Field>

        <Field legend="Time on a cooking night">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Time on a cooking night">
            {([20, 30, 45] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={prefs.cookTime === t}
                onClick={() => setPrefs((p) => ({ ...p, cookTime: t }))}
                className={chip(prefs.cookTime === t)}
              >
                {t} min
              </button>
            ))}
          </div>
        </Field>
      </div>

      <Field legend="Weekly food budget">
        <div className="flex items-center gap-4">
          <input
            type="range"
            aria-label="Weekly food budget"
            min={range.min}
            max={range.max}
            step={range.step}
            value={prefs.budget}
            onChange={(e) => setPrefs((p) => ({ ...p, budget: Number(e.target.value) }))}
            className="h-2 flex-1 cursor-pointer accent-apple"
          />
          <output className="w-16 text-right text-lg font-bold tabular-nums">{formatMoney(prefs.budget, locale)}</output>
        </div>
      </Field>

      <Field legend="This week you’re feeling">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="This week you’re feeling">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={prefs.mood === m.value}
              onClick={() => setPrefs((p) => ({ ...p, mood: m.value }))}
              className={chip(prefs.mood === m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Field>

      <Field legend="Keep these off the plate">
        <div className="flex flex-wrap gap-2">
          {AVOIDS.map((a) => {
            const active = prefs.avoid.includes(a.value)
            return (
              <button
                key={a.value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setPrefs((p) => ({
                    ...p,
                    avoid: active ? p.avoid.filter((v) => v !== a.value) : [...p.avoid, a.value],
                  }))
                }
                className={chip(active)}
              >
                {a[locale]}
              </button>
            )
          })}
        </div>
      </Field>

      <button
        type="submit"
        className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-apple px-6 py-4 text-base font-bold text-primary-foreground shadow-[0_14px_30px_-12px_rgba(214,42,51,0.7)] transition hover:brightness-110 active:scale-[0.99]"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        {plan ? 'Rework my plan' : 'Make my Sunday Plan'}
      </button>
    </form>
  )
}
