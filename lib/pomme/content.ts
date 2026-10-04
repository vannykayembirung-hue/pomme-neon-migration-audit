import type { Locale } from './recipes'

export const PRICES: Record<
  Locale,
  { monthly: number; annual: number; symbol: string; currency: string }
> = {
  us: { monthly: 9.99, annual: 79, symbol: '$', currency: 'USD' },
  uk: { monthly: 8.99, annual: 69, symbol: '£', currency: 'GBP' },
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
  'Swap any meal in a tap',
  'Smart grocery list that remembers your cupboard',
  'Budget mode for the weeks money’s tight',
  'Pantry memory, so you stop buying a third jar of cumin',
  'Weekly reset: one calm look at the week ahead',
  'Recipes that adapt to what you’ve got and how you feel',
]

export const FAQS = [
  {
    q: 'What is Pomme, exactly?',
    a: 'Pomme is a personal weekly planner that starts with food. Tell her what your week looks like and she builds your dinners, your grocery list and a realistic plan around your time, budget and mood. Then she gets a little better at it every week.',
  },
  {
    q: 'Is this a diet app?',
    a: 'No. There’s no calorie counting, no weigh-ins and no “good” or “bad” foods. Pomme is about eating well without the mental load: proper meals, less waste, fewer “what’s for dinner?” moments.',
  },
  {
    q: 'How does Pomme learn what I like?',
    a: 'Every swap, skip and saved recipe teaches her something. After a few weeks she knows you’d rather not cook on Wednesdays, that Fridays need to be quick, and which ingredients you always run out of.',
  },
  {
    q: 'Can it keep my food shop on budget?',
    a: 'Yes. Set a weekly number and Pomme plans around it, reusing ingredients across meals so you buy less and waste less. With Pomme Plus, budget mode finds cheaper swaps when a week runs over.',
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
    a: 'Only if you’d like to. It’s an optional preference, a gentle nudge towards meals that suit how you’re feeling. It isn’t medical advice, and Pomme never makes health claims.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Of course. Cancel in two taps from your account. No phone calls, no guilt trips. You keep your free plan either way.',
  },
]
