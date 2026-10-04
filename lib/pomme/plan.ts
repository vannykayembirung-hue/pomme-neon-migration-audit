import {
  AISLE_ORDER,
  RECIPES,
  localName,
  type Aisle,
  type Avoid,
  type Locale,
  type Mood,
  type Recipe,
} from './recipes'

export type DayMode = 'cook' | 'quick' | 'off'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type Prefs = {
  household: number
  days: DayMode[]
  cookTime: 20 | 30 | 45
  budget: number
  mood: Mood
  avoid: Avoid[]
}

export type PlanDay =
  | { day: number; kind: 'meal'; mode: DayMode; recipe: Recipe; batch: boolean }
  | { day: number; kind: 'leftovers'; fromDay: number; recipe: Recipe }
  | { day: number; kind: 'off' }

export type BasketItem = {
  key: string
  label: string
  aisle: Aisle
  meals: number
  staple: boolean
}

export type Plan = {
  days: PlanDay[]
  basket: { aisle: Aisle; items: BasketItem[] }[]
  staples: BasketItem[]
  total: number
  activeMinutes: number
  dinners: number
  notes: string[]
}

export const DEFAULT_BUDGET: Record<Locale, number> = { us: 90, uk: 70 }
export const BUDGET_RANGE: Record<Locale, { min: number; max: number; step: number }> = {
  us: { min: 40, max: 220, step: 5 },
  uk: { min: 30, max: 170, step: 5 },
}

export const DEFAULT_PREFS: Prefs = {
  household: 2,
  days: ['cook', 'quick', 'off', 'cook', 'quick', 'cook', 'cook'],
  cookTime: 30,
  budget: DEFAULT_BUDGET.us,
  mood: 'cosy',
  avoid: [],
}

const UK_PRICE_FACTOR = 0.78

export function priceFor(usd: number, locale: Locale) {
  return locale === 'uk' ? usd * UK_PRICE_FACTOR : usd
}

export function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'uk' ? 'en-GB' : 'en-US', {
    style: 'currency',
    currency: locale === 'uk' ? 'GBP' : 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function jitter(id: string, seed: number) {
  let h = seed * 2654435761
  for (let c = 0; c < id.length; c++) h = Math.imul(h ^ id.charCodeAt(c), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

export function generatePlan(prefs: Prefs, locale: Locale, seed = 0): Plan {
  const eligible = RECIPES.filter((r) => !r.contains.some((a) => prefs.avoid.includes(a)))
  const pool = eligible.length > 0 ? eligible : RECIPES.filter((r) => r.contains.length === 0)
  const cookNights = prefs.days.filter((d) => d !== 'off').length || 1
  const perServingBudget = prefs.budget / cookNights / prefs.household

  const used = new Set<string>()
  const pickedKeys = new Map<string, number>()
  const days: PlanDay[] = []
  let pendingLeftovers: { recipe: Recipe; day: number; index: number } | null = null

  prefs.days.forEach((mode, day) => {
    if (mode === 'off') {
      if (pendingLeftovers) {
        days.push({ day, kind: 'leftovers', fromDay: pendingLeftovers.day, recipe: pendingLeftovers.recipe })
        const source = days[pendingLeftovers.index]
        if (source.kind === 'meal') source.batch = true
        pendingLeftovers = null
      } else {
        days.push({ day, kind: 'off' })
      }
      return
    }

    const maxTime = mode === 'quick' ? 20 : prefs.cookTime
    const nextIsOff = prefs.days[day + 1] === 'off'
    let candidates = pool.filter((r) => !used.has(r.id) && r.time <= maxTime)
    if (candidates.length === 0) candidates = pool.filter((r) => !used.has(r.id))
    if (candidates.length === 0) candidates = pool

    const scored = candidates
      .map((r) => {
        let score = jitter(r.id, seed) * 1.5
        if (r.moods.includes(prefs.mood)) score += 3
        if (mode === 'quick' && r.time <= 15) score += 1
        if (nextIsOff && r.makesLeftovers) score += 2.5
        const cost = priceFor(r.costPerServingUsd, locale)
        score += cost <= perServingBudget ? 1 : -2
        const shared = r.ingredients.filter((ing) => !ing.staple && pickedKeys.has(ing.key)).length
        score += shared * 0.6
        return { r, score }
      })
      .sort((a, b) => b.score - a.score)

    const recipe = scored[0].r
    used.add(recipe.id)
    recipe.ingredients.forEach((ing) => pickedKeys.set(ing.key, (pickedKeys.get(ing.key) ?? 0) + 1))
    days.push({ day, kind: 'meal', mode, recipe, batch: false })
    if (recipe.makesLeftovers) pendingLeftovers = { recipe, day, index: days.length - 1 }
  })

  const items = new Map<string, BasketItem>()
  let total = 0
  let activeMinutes = 0
  let dinners = 0

  for (const entry of days) {
    if (entry.kind !== 'meal') continue
    dinners++
    activeMinutes += entry.recipe.time
    const servings = prefs.household * (entry.batch ? 2 : 1)
    total += priceFor(entry.recipe.costPerServingUsd, locale) * servings
    for (const ing of entry.recipe.ingredients) {
      const existing = items.get(ing.key)
      if (existing) existing.meals++
      else
        items.set(ing.key, {
          key: ing.key,
          label: localName(ing, locale),
          aisle: ing.aisle,
          meals: 1,
          staple: Boolean(ing.staple),
        })
    }
  }

  const all = [...items.values()]
  const basket = AISLE_ORDER.map((aisle) => ({
    aisle,
    items: all.filter((it) => it.aisle === aisle && !it.staple).sort((a, b) => b.meals - a.meals),
  })).filter((group) => group.items.length > 0)
  const staples = all.filter((it) => it.staple)

  const notes: string[] = []
  const leftover = days.find((d) => d.kind === 'leftovers')
  if (leftover && leftover.kind === 'leftovers') {
    notes.push(
      `${DAY_NAMES[leftover.day]} is a night off. ${DAY_NAMES[leftover.fromDay]}’s ${localName(
        leftover.recipe.name,
        locale,
      ).toLowerCase()} makes enough for both.`,
    )
  }
  const mostShared = all.filter((it) => !it.staple).sort((a, b) => b.meals - a.meals)[0]
  if (mostShared && mostShared.meals > 1) {
    notes.push(`${mostShared.label} shows up in ${mostShared.meals} meals, so nothing ends up in the bin.`)
  }
  const quickNights = prefs.days.filter((d) => d === 'quick').length
  if (quickNights > 0) {
    notes.push(
      `${quickNights} quick ${quickNights === 1 ? 'night' : 'nights'}, nothing over 20 minutes.`,
    )
  }
  const diff = prefs.budget - total
  notes.push(
    diff >= 0
      ? `About ${formatMoney(diff, locale)} under your budget this week.`
      : `About ${formatMoney(-diff, locale)} over budget. Budget mode can fix that.`,
  )

  return { days, basket, staples, total, activeMinutes, dinners, notes }
}

const DAY_PATTERNS: [RegExp, number][] = [
  [/\bmon(day)?s?\b/, 0],
  [/\btue(s|sday)?s?\b/, 1],
  [/\bwed(nesday)?s?\b/, 2],
  [/\bthu(rs|rsday)?s?\b/, 3],
  [/\bfri(day)?s?\b/, 4],
  [/\bsat(urday)?s?\b/, 5],
  [/\bsun(day)?s?\b/, 6],
]

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
}

export function parseWeekNote(
  note: string,
  base: Prefs,
  baseLocale: Locale,
): { prefs: Prefs; locale: Locale } {
  const text = note.toLowerCase()
  const prefs: Prefs = { ...base, days: [...base.days], avoid: [...base.avoid] }
  let locale = baseLocale

  const money = text.match(/([$£])\s?(\d{2,3})|(\d{2,3})\s?(dollars|bucks|pounds|quid)/)
  if (money) {
    const symbol = money[1] ?? (/(pounds|quid)/.test(money[4] ?? '') ? '£' : '$')
    locale = symbol === '£' ? 'uk' : 'us'
    const range = BUDGET_RANGE[locale]
    prefs.budget = Math.min(range.max, Math.max(range.min, Number(money[2] ?? money[3])))
  } else if (locale !== baseLocale) {
    prefs.budget = DEFAULT_BUDGET[locale]
  }

  const people =
    text.match(/(\d)\s*(of us|people|ppl|adults|kids)/) ??
    text.match(/family of (\d|\w+)/) ??
    text.match(/\b(one|two|three|four|five|six) of us\b/) ??
    text.match(/\bfor (two|three|four|five|six)\b/)
  if (people) {
    const raw = people[1]
    const n = Number(raw) || WORD_NUMBERS[raw] || base.household
    prefs.household = Math.min(6, Math.max(1, n))
  } else if (/\b(just me|solo|for one|on my own)\b/.test(text)) {
    prefs.household = 1
  }

  if (/\bvegan\b/.test(text)) {
    prefs.avoid = [...new Set([...prefs.avoid, 'meat', 'fish', 'dairy'] as Avoid[])]
  } else if (/\b(veg|veggie|vegetarian|plant[- ]based|meat[- ]free)\b/.test(text)) {
    prefs.avoid = [...new Set([...prefs.avoid, 'meat', 'fish'] as Avoid[])]
  }
  const avoidRules: [RegExp, Avoid][] = [
    [/\b(no|hate|not|without|avoid)\b[^,.]*\b(fish|seafood|salmon)\b/, 'fish'],
    [/\b(no|hate|not|without|avoid)\b[^,.]*\bmushrooms?\b/, 'mushroom'],
    [/\b(no|hate|not|without|avoid)\b[^,.]*\b(cilantro|coriander)\b/, 'cilantro'],
    [/\b(no|hate|not|without|avoid)\b[^,.]*\b(spicy|spice|heat)\b/, 'spicy'],
    [/\b(no|hate|not|without|avoid)\b[^,.]*\b(dairy|lactose)\b|dairy[- ]free/, 'dairy'],
  ]
  for (const [rule, value] of avoidRules) {
    if (rule.test(text) && !prefs.avoid.includes(value)) prefs.avoid.push(value)
  }

  if (/\bbusy week\b|\bmanic\b|\bhectic\b/.test(text)) {
    prefs.days = prefs.days.map((d) => (d === 'cook' ? 'quick' : d))
  }
  const clauses = text.split(/[,.;!]|\band\b|\bbut\b/)
  for (const clause of clauses) {
    for (const [pattern, index] of DAY_PATTERNS) {
      if (!pattern.test(clause)) continue
      if (/(off|out|late|skip|hate|no cooking|not cooking|date|away|takeout|takeaway|leftovers)/.test(clause)) {
        prefs.days[index] = 'off'
      } else if (/(busy|quick|gym|fast|tired|class|training|easy)/.test(clause)) {
        prefs.days[index] = 'quick'
      } else if (/(slow|proper|time|relaxed|cook|free)/.test(clause)) {
        prefs.days[index] = 'cook'
      }
    }
  }

  if (/\b(cosy|cozy|comfort|rainy|cold|snug)\b/.test(text)) prefs.mood = 'cosy'
  else if (/\b(fresh|light|summer|bright|reset)\b/.test(text)) prefs.mood = 'fresh'
  else if (/\b(energ|gym|active|training|run)/.test(text)) prefs.mood = 'energised'
  else if (/\b(tired|lazy|exhausted|low[- ]effort|done|knackered|wiped)\b/.test(text)) prefs.mood = 'easy'

  return { prefs, locale }
}
