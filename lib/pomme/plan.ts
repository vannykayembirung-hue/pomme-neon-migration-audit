import {
  AISLE_ORDER,
  RECIPES,
  localName,
  type Aisle,
  type Avoid,
  type Locale,
  type Mood,
  type QtyUnit,
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

/** A quick night never asks for more than this. */
export const MAX_QUICK_TIME = 20

export type Prefs = {
  household: number
  days: DayMode[]
  cookTime: 20 | 30 | 45
  budget: number
  mood: Mood
  avoid: Avoid[]
}

export type PlanDay =
  | { day: number; kind: 'meal'; mode: DayMode; recipe: Recipe; batch: boolean; overTime: boolean }
  | { day: number; kind: 'leftovers'; fromDay: number; recipe: Recipe }
  | { day: number; kind: 'off' }

export type BasketItem = {
  key: string
  label: string
  aisle: Aisle
  meals: number
  staple: boolean
  /** Total shoppable quantity for the week: Σ qtyPerServing × servings. */
  amount: number
  unit: QtyUnit
}

export type Plan = {
  days: PlanDay[]
  basket: { aisle: Aisle; items: BasketItem[] }[]
  staples: BasketItem[]
  total: number
  activeMinutes: number
  dinners: number
  notes: string[]
  /** The budget this plan was generated against — always the source of truth for the UI. */
  budget: number
  /** Household size this plan was generated for (portions shown on recipes). */
  servings: number
  /** Honest disclaimers: limited variety, time overflows. Never silent. */
  warnings: string[]
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

const roundUp = (value: number, step: number) => Math.ceil(value / step - 1e-9) * step

/** Human shopping quantity for a weekly total, e.g. "2 cans", "500 g", "1.2 kg", "1.3 l", "3 ×". */
export function formatQty(amount: number, unit: QtyUnit): string {
  // kg/l are display-equivalents of g/ml (1 kg = 1000 g, 1 l = 1000 ml).
  if (unit === 'kg') return formatQty(amount * 1000, 'g')
  if (unit === 'l') return formatQty(amount * 1000, 'ml')
  if (unit === 'g') {
    return amount >= 1000 ? `${(roundUp(amount, 100) / 1000).toFixed(1).replace(/\.0$/, '')} kg` : `${roundUp(amount, 5)} g`
  }
  if (unit === 'ml') {
    return amount >= 1000 ? `${(roundUp(amount, 100) / 1000).toFixed(1).replace(/\.0$/, '')} l` : `${roundUp(amount, 10)} ml`
  }
  const n = Math.max(1, Math.ceil(amount - 1e-9))
  if (unit === 'tbsp') return `${n} tbsp`
  if (unit === 'tsp') return `${n} tsp`
  if (unit === 'cans') return `${n} ${n === 1 ? 'can' : 'cans'}`
  if (unit === 'packs') return `${n} ${n === 1 ? 'pack' : 'packs'}`
  return `${n} ${n === 1 ? 'pc' : 'pcs'}`
}

function jitter(id: string, seed: number) {
  let h = seed * 2654435761
  for (let c = 0; c < id.length; c++) h = Math.imul(h ^ id.charCodeAt(c), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

const eligiblePool = (prefs: Prefs) => {
  const eligible = RECIPES.filter((r) => !r.contains.some((a) => prefs.avoid.includes(a)))
  return eligible.length > 0 ? eligible : RECIPES.filter((r) => r.contains.length === 0)
}

const timeLimitFor = (mode: DayMode, prefs: Prefs) => (mode === 'quick' ? MAX_QUICK_TIME : prefs.cookTime)

/** Base family for safe summing: kg→g, l→ml (1 kg = 1000 g, 1 l = 1000 ml); every other unit stands alone. */
const unitFamily = (unit: QtyUnit): QtyUnit => (unit === 'kg' ? 'g' : unit === 'l' ? 'ml' : unit)

/** Express a per-serving amount in its unit family before any sum. */
const toBaseAmount = (amount: number, unit: QtyUnit): number =>
  unit === 'kg' || unit === 'l' ? amount * 1000 : amount

/**
 * Rebuilds every derived value (basket, quantities, cost, notes, warnings) from a
 * fixed week of days. Single source of truth for generatePlan and applySwap.
 */
export function rebuildPlan(days: PlanDay[], prefs: Prefs, locale: Locale): Plan {
  const items = new Map<string, BasketItem>()
  let total = 0
  let activeMinutes = 0
  let dinners = 0
  const cooked = new Map<string, number>()

  for (const entry of days) {
    if (entry.kind !== 'meal') continue
    dinners++
    activeMinutes += entry.recipe.time
    cooked.set(entry.recipe.id, (cooked.get(entry.recipe.id) ?? 0) + 1)
    const servings = prefs.household * (entry.batch ? 2 : 1)
    total += priceFor(entry.recipe.costPerServingUsd, locale) * servings
    for (const ing of entry.recipe.ingredients) {
      // Aggregate on (key, unit family): identical ingredients sum up across
      // recipes (200 g + 300 g + 250 g → 750 g), kg/l convert into g/ml first,
      // and incompatible units never add up — they stay on separate lines.
      const family = unitFamily(ing.unit)
      const groupKey = `${ing.key}\u0000${family}`
      const amount = toBaseAmount(ing.qtyPerServing * servings, ing.unit)
      const existing = items.get(groupKey)
      if (existing) {
        existing.meals++
        existing.amount += amount
      } else {
        items.set(groupKey, {
          key: ing.key,
          label: localName(ing, locale),
          aisle: ing.aisle,
          meals: 1,
          staple: Boolean(ing.staple),
          amount,
          unit: family,
        })
      }
    }
  }

  const all = [...items.values()]
  // Retrocompatible keys: a key aggregated in one unit keeps its plain id; a key
  // split across incompatible units gets one distinct line per unit family.
  const keyCounts = new Map<string, number>()
  for (const it of all) keyCounts.set(it.key, (keyCounts.get(it.key) ?? 0) + 1)
  for (const it of all) {
    if ((keyCounts.get(it.key) ?? 0) > 1) it.key = `${it.key}-${it.unit}`
  }
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
      `${quickNights} quick ${quickNights === 1 ? 'night' : 'nights'}, nothing over ${MAX_QUICK_TIME} minutes.`,
    )
  }
  const diff = prefs.budget - total
  notes.push(
    diff >= 0
      ? `About ${formatMoney(diff, locale)} under your budget this week.`
      : `About ${formatMoney(-diff, locale)} over budget. Budget mode can fix that.`,
  )

  // Honest warnings — never hide a constraint violation.
  const warnings: string[] = []
  const slotCount = days.filter((d) => d.kind === 'meal').length
  const pool = eligiblePool(prefs)
  const repeatedHard = [...cooked.values()].some((n) => n > 2)
  // A repeat never counts as a new recipe: if the meals actually cooked cover
  // fewer distinct recipes than there are slots, scarcity forced the repeat and
  // the week must not look normally varied.
  if (repeatedHard || cooked.size < slotCount || pool.length < slotCount) {
    warnings.push('Limited variety this week — here’s what Pomme can do with your restrictions.')
  }
  const overTimeMeals = days.filter(
    (d): d is Extract<PlanDay, { kind: 'meal' }> =>
      d.kind === 'meal' && d.recipe.time > timeLimitFor(d.mode, prefs),
  )
  if (overTimeMeals.length === 1) {
    warnings.push('One meal goes beyond your usual cooking time.')
  } else if (overTimeMeals.length > 1) {
    warnings.push(`${overTimeMeals.length} meals go beyond your usual cooking time.`)
  }

  const flagged: PlanDay[] = days.map((entry) =>
    entry.kind === 'meal'
      ? { ...entry, overTime: entry.recipe.time > timeLimitFor(entry.mode, prefs) }
      : entry,
  )

  return {
    days: flagged,
    basket,
    staples,
    total,
    activeMinutes,
    dinners,
    notes,
    budget: prefs.budget,
    servings: prefs.household,
    warnings,
  }
}

export function generatePlan(prefs: Prefs, locale: Locale, seed = 0): Plan {
  const pool = eligiblePool(prefs)
  const cookNights = prefs.days.filter((d) => d !== 'off').length || 1
  const perServingBudget = prefs.budget / cookNights / prefs.household

  const counts = new Map<string, number>()
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

    const maxTime = timeLimitFor(mode, prefs)
    const nextIsOff = prefs.days[day + 1] === 'off'
    const withCount = (n: number, timeOk: boolean) =>
      pool.filter((r) => (counts.get(r.id) ?? 0) === n && (timeOk ? r.time <= maxTime : r.time > maxTime))

    // Variety first, time honesty second, silence never:
    //  1) new recipe on time  2) one repeat on time  3) new recipe over time
    //  4) one repeat over time  5) beyond the 2-cook cap (only if nothing else)
    let candidates = withCount(0, true)
    if (candidates.length === 0) candidates = withCount(1, true)
    if (candidates.length === 0) candidates = withCount(0, false)
    if (candidates.length === 0) candidates = withCount(1, false)
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
        if (r.time > maxTime) score -= (r.time - maxTime) * 0.05 // prefer the least overflow
        score -= (counts.get(r.id) ?? 0) * 0.25 // prefer fresh picks on repeats
        return { r, score }
      })
      .sort((a, b) => b.score - a.score)

    const recipe = scored[0].r
    counts.set(recipe.id, (counts.get(recipe.id) ?? 0) + 1)
    recipe.ingredients.forEach((ing) => pickedKeys.set(ing.key, (pickedKeys.get(ing.key) ?? 0) + 1))
    days.push({ day, kind: 'meal', mode, recipe, batch: false, overTime: false })
    if (recipe.makesLeftovers) pendingLeftovers = { recipe, day, index: days.length - 1 }
  })

  return rebuildPlan(days, prefs, locale)
}

/** Stable identity of a week: which meal lands where. Used by "Rework my plan". */
export function planSignature(plan: Plan): string {
  return plan.days
    .map((d) => (d.kind === 'meal' ? `${d.day}m:${d.recipe.id}` : d.kind === 'leftovers' ? `${d.day}l:${d.recipe.id}` : `${d.day}x`))
    .join('|')
}

/**
 * First seed ≥ start whose plan differs from `previous`, so "Rework my plan" always visibly reworks.
 * Every returned seed is verified against `previous`; when no seed within `maxTries`
 * can produce a different week (seed-invariant pool), the change is impossible with
 * the available constraints and the last verified seed is returned deterministically.
 */
export function findNextSeed(
  prefs: Prefs,
  locale: Locale,
  startSeed: number,
  previous: string | null,
  maxTries = 32,
): number {
  let seed = Math.max(1, startSeed)
  let lastVerified = seed
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const signature = planSignature(generatePlan(prefs, locale, seed))
    if (!previous || signature !== previous) return seed
    lastVerified = seed
    seed++
  }
  return lastVerified
}

function swapDays(plan: Plan, dayIndex: number, recipe: Recipe): PlanDay[] {
  return plan.days.map((entry) => {
    if (entry.kind === 'meal' && entry.day === dayIndex) {
      return { ...entry, recipe }
    }
    if (entry.kind === 'leftovers' && entry.fromDay === dayIndex) {
      // Leftovers always follow the meal they were batched from.
      return { ...entry, recipe }
    }
    return entry
  })
}

/**
 * Replaces the meal on `dayIndex`, keeping the rest of the week untouched and
 * rebuilding the basket, cost and warnings from the new week. Returns the plan
 * unchanged when the swap is not allowed (day, recipe or exclusions).
 */
export function applySwap(plan: Plan, dayIndex: number, recipeId: string, prefs: Prefs, locale: Locale): Plan {
  const entry = plan.days[dayIndex]
  if (!entry || entry.kind !== 'meal') return plan
  if (entry.recipe.id === recipeId) return plan
  const recipe = RECIPES.find((r) => r.id === recipeId)
  if (!recipe) return plan
  if (recipe.contains.some((a) => prefs.avoid.includes(a))) return plan
  return rebuildPlan(swapDays(plan, dayIndex, recipe), prefs, locale)
}

/** Applies a persisted {day → recipeId} map in order. */
export function applySwaps(plan: Plan, swaps: Record<number, string>, prefs: Prefs, locale: Locale): Plan {
  const entries = Object.entries(swaps).sort(([a], [b]) => Number(a) - Number(b))
  let current = plan
  for (const [day, recipeId] of entries) {
    current = applySwap(current, Number(day), recipeId, prefs, locale)
  }
  return current
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
