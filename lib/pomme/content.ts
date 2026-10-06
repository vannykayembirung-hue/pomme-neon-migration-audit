import type { Locale } from './recipes'

export const PRICES: Record<
  Locale,
  { monthly: number; annual: number; symbol: string; currency: string }
> = {
  us: { monthly: 5.99, annual: 49, symbol: '$', currency: 'USD' },
  uk: { monthly: 4.99, annual: 39, symbol: '£', currency: 'GBP' },
}

export function priceLabel(value: number, locale: Locale) {
  const { symbol } = PRICES[locale]
  return Number.isInteger(value) ? `${symbol}${value}` : `${symbol}${value.toFixed(2)}`
}

export function annualSaving(locale: Locale) {
  const { monthly, annual } = PRICES[locale]
  return Math.round((1 - annual / (monthly * 12)) * 100)
}

export const PLUS_FEATURES = [
  'A fresh plan every Sunday, as many as you like',
  'Unlimited swaps — change any meal, any night',
  'Smart grocery list with real quantities, sorted by aisle',
  'Budget mode for the weeks money’s tight (coming soon)',
  'Leftovers planned into your week automatically',
  'Full recipes: quantities, steps and portions',
  'Early access to new recipes as Pomme’s kitchen grows',
]

export const FAQS = [
  {
    q: 'What is Pomme, exactly?',
    a: 'Pomme is a personal weekly planner that starts with food. Tell her what your week looks like and she builds your dinners, your grocery list and a realistic plan around your time, budget and mood. Every week you plan is another week sorted.',
  },
  {
    q: 'Is this a diet app?',
    a: 'No. There’s no calorie counting, no weigh-ins and no “good” or “bad” foods. Pomme is about eating well without the mental load: proper meals, less waste, fewer “what’s for dinner?” moments.',
  },
  {
    q: 'How does Pomme learn what I like?',
    a: 'Learning is the next chapter, coming to Pomme Plus. Today, Pomme plans from exactly what you tell her — your week, your budget, your mood, your no-gos — and remembers your weeks on this device. The version that notices your rhythm on her own is on the way.',
  },
  {
    q: 'Can it keep my food shop on budget?',
    a: 'Yes. Set a weekly number and Pomme plans around it, reusing ingredients across meals so you buy less and waste less. With Pomme Plus, budget mode (coming soon) will find cheaper swaps when a week runs over.',
  },
  {
    q: 'Does it work in both the US and the UK?',
    a: 'It does. Prices show in dollars or pounds, and the language follows you: cilantro or coriander, zucchini or courgette, pantry or cupboard.',
  },
  {
    q: 'Can I plan for a partner or family?',
    a: 'Yes. Plan for one to six people. Quantities and your grocery list scale automatically.',
  },
  {
    q: 'Do you plan around my cycle?',
    a: 'Not yet — it’s on the roadmap as an optional preference, a gentle nudge towards meals that suit how you’re feeling. It isn’t medical advice, and Pomme never makes health claims.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'There’s nothing to cancel yet: planning is free and no card is ever needed. When Pomme Plus launches, cancelling will be two taps — no phone calls, no guilt trips. You keep your free plan either way.',
  },
]
