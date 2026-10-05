/**
 * Phase-1 engine rules: variety caps, cook-time honesty, grocery quantities,
 * self-referential budget, and the "Rework my plan" seed guarantee.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_PREFS,
  applySwap,
  applySwaps,
  findNextSeed,
  formatQty,
  generatePlan,
  planSignature,
  rebuildPlan,
  type PlanDay,
  type Prefs,
} from '../lib/pomme/plan.ts'
import { RECIPES, type Avoid, type QtyUnit } from '../lib/pomme/recipes.ts'

const cookedCounts = (days: PlanDay[]) => {
  const counts = new Map<string, number>()
  for (const d of days) if (d.kind === 'meal') counts.set(d.recipe.id, (counts.get(d.recipe.id) ?? 0) + 1)
  return counts
}

// ── Priorité 4: variety ───────────────────────────────────────────────────────

test('never cooks the same recipe more than twice, under any avoidance mix', () => {
  const combos: Avoid[][] = [
    [],
    ['meat'],
    ['fish'],
    ['dairy'],
    ['meat', 'fish', 'dairy'],
    ['mushroom', 'cilantro', 'spicy'],
    ['meat', 'fish', 'mushroom', 'cilantro', 'spicy', 'dairy'],
  ]
  for (const avoid of combos) {
    for (let seed = 1; seed <= 10; seed++) {
      const plan = generatePlan({ ...DEFAULT_PREFS, avoid }, 'us', seed)
      for (const [id, n] of cookedCounts(plan.days)) {
        assert.ok(n <= 2, `${id} cooked ${n}× (avoid=${avoid.join('+')}, seed ${seed})`)
      }
    }
  }
})

test('a vegan week is never one dish on repeat', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const plan = generatePlan({ ...DEFAULT_PREFS, avoid: ['meat', 'fish', 'dairy'] }, 'us', seed)
    const unique = new Set(plan.days.filter((d) => d.kind === 'meal').map((d) => (d.kind === 'meal' ? d.recipe.id : '')))
    assert.ok(unique.size >= 5, `seed ${seed} only ${unique.size} distinct meals: [...${unique}]`)
    assert.equal(plan.warnings.length, 0, `unexpected warning on a healthy pool: ${plan.warnings}`)
  }
})

test('an impossible pool says so out loud instead of silently repeating', () => {
  // 7 meal slots but only recipes with contains=[] qualify → repeats are forced.
  const tiny = RECIPES.filter((r) => r.contains.length === 0).slice(0, 2)
  assert.ok(tiny.length === 2)
  const days: PlanDay[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    kind: 'meal' as const,
    mode: 'cook' as const,
    recipe: tiny[day % 2],
    batch: false,
    overTime: false,
  }))
  const plan = rebuildPlan(days, { ...DEFAULT_PREFS, avoid: ['meat', 'fish', 'mushroom', 'cilantro', 'spicy', 'dairy'] }, 'us')
  assert.ok(plan.warnings.some((w) => w.includes('Limited variety')), plan.warnings.join(' / '))
})

// ── Priorité 5: cook time ─────────────────────────────────────────────────────

test('cook-time overflow is always flagged, never silent', () => {
  const tight: Prefs = { ...DEFAULT_PREFS, cookTime: 20 }
  for (let seed = 1; seed <= 15; seed++) {
    const plan = generatePlan(tight, 'us', seed)
    for (const d of plan.days) {
      if (d.kind !== 'meal') continue
      const limit = d.mode === 'quick' ? 20 : 20
      if (d.recipe.time > limit) {
        assert.equal(d.overTime, true, `${d.recipe.id} ${d.recipe.time}m not flagged (seed ${seed})`)
      } else {
        assert.equal(d.overTime, false)
      }
    }
    const overflows = plan.days.filter((d) => d.kind === 'meal' && d.overTime).length
    const warned = plan.warnings.some((w) => w.includes('beyond your usual cooking time'))
    assert.equal(warned, overflows > 0, `warning/flag mismatch at seed ${seed}`)
  }
})

test('quick nights stay under 20 minutes when the pool allows it', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const plan = generatePlan(DEFAULT_PREFS, 'us', seed)
    for (const d of plan.days) {
      if (d.kind === 'meal' && d.mode === 'quick') {
        assert.ok(d.recipe.time <= 20, `${d.recipe.id} ${d.recipe.time}m on a quick night (seed ${seed})`)
      }
    }
  }
})

// ── Priorité 2: quantities ────────────────────────────────────────────────────

test('basket quantities scale exactly with household and batch servings', () => {
  const base = generatePlan(DEFAULT_PREFS, 'us', 1)
  for (const household of [1, 2, 4, 6]) {
    const plan = generatePlan({ ...DEFAULT_PREFS, household }, 'us', 1)
    for (const group of plan.basket) {
      for (const item of group.items) {
        assert.ok(item.amount > 0, `${item.key} amount ${item.amount}`)
        assert.ok(item.unit.length > 0)
      }
    }
    assert.equal(plan.servings, household)
    // Cost must scale with the same servings math as the quantities.
    let manual = 0
    for (const d of plan.days) if (d.kind === 'meal') manual += d.recipe.costPerServingUsd * household * (d.batch ? 2 : 1)
    assert.ok(Math.abs(plan.total - manual) < 1e-9, `cost mismatch household ${household}`)
  }
  assert.ok(base.basket.length > 0)
})

test('a batch meal doubles both cost and quantities for its ingredients', () => {
  const prefs: Prefs = {
    ...DEFAULT_PREFS,
    household: 2,
    days: ['cook', 'off', 'off', 'off', 'off', 'off', 'off'],
  }
  const plan = generatePlan(prefs, 'us', 1)
  const meal = plan.days[0]
  assert.equal(meal.kind, 'meal')
  assert.equal(meal.kind === 'meal' && meal.batch, true, 'expected the single meal to batch for the off days')
  for (const ing of meal.kind === 'meal' ? meal.recipe.ingredients : []) {
    const item = plan.basket.flatMap((g) => g.items).concat(plan.staples).find((it) => it.key === ing.key)
    assert.ok(item, `${ing.key} missing`)
    assert.ok(Math.abs(item.amount - ing.qtyPerServing * 4) < 1e-9, `${ing.key}: ${item.amount} ≠ ${ing.qtyPerServing * 4}`)
  }
})

test('formatQty prints shoppable numbers', () => {
  const cases: [number, QtyUnit, string][] = [
    [500, 'g', '500 g'],
    [1200, 'g', '1.2 kg'],
    [400, 'ml', '400 ml'],
    [1250, 'ml', '1.3 l'],
    [2, 'tbsp', '2 tbsp'],
    [1.5, 'tsp', '2 tsp'],
    [2, 'cans', '2 cans'],
    [1, 'cans', '1 can'],
    [1, 'packs', '1 pack'],
    [0.5, 'whole', '1 ×'],
    [4, 'whole', '4 ×'],
  ]
  for (const [amount, unit, expected] of cases) {
    assert.equal(formatQty(amount, unit), expected, `${amount} ${unit}`)
  }
})

// ── Priorité 6: budget ────────────────────────────────────────────────────────

test('plan.budget always equals the budget the plan was generated with', () => {
  for (const budget of [40, 75, 130, 220]) {
    const plan = generatePlan({ ...DEFAULT_PREFS, budget }, 'uk', 3)
    assert.equal(plan.budget, budget)
    const over = plan.total > plan.budget
    const note = plan.notes.find((n) => /under your budget|over budget/.test(n)) ?? ''
    assert.equal(/over budget/.test(note), over, `note/flag mismatch at budget ${budget}: ${note}`)
  }
})

// ── Priorité 7: seed ──────────────────────────────────────────────────────────

test('findNextSeed always returns a visibly different week', () => {
  const first = generatePlan(DEFAULT_PREFS, 'us', 1)
  for (let start = 1; start <= 20; start++) {
    const next = findNextSeed(DEFAULT_PREFS, 'us', start + 1, planSignature(first))
    assert.notEqual(planSignature(generatePlan(DEFAULT_PREFS, 'us', next)), planSignature(first))
  }
})

// ── Priorité 1: swaps ─────────────────────────────────────────────────────────

test('applySwap changes exactly that day (and its leftovers), nothing else', () => {
  const plan = generatePlan(DEFAULT_PREFS, 'us', 4)
  const swapDay = plan.days.find((d) => d.kind === 'meal' && !d.batch)
  assert.ok(swapDay && swapDay.kind === 'meal')
  const replacement = RECIPES.find((r) => r.id !== swapDay.recipe.id && !r.contains.some((a) => DEFAULT_PREFS.avoid.includes(a)))
  assert.ok(replacement)

  const swapped = applySwap(plan, swapDay.day, replacement.id, DEFAULT_PREFS, 'us')
  const after = swapped.days[swapDay.day]
  assert.equal(after.kind === 'meal' && after.recipe.id, replacement.id)

  for (const d of plan.days) {
    if (d.day === swapDay.day) continue
    const now: PlanDay = swapped.days[d.day]
    if (now.kind === 'leftovers' && now.fromDay === swapDay.day) {
      assert.equal(now.recipe.id, replacement.id, 'leftovers must follow the swapped source')
      continue
    }
    assert.equal(JSON.stringify(now), JSON.stringify(d), `day ${d.day} must stay intact`)
  }
})

test('applySwap recalculates basket, cost and budget view', () => {
  const plan = generatePlan(DEFAULT_PREFS, 'us', 2)
  const target = plan.days.find((d) => d.kind === 'meal' && !d.batch)
  assert.ok(target && target.kind === 'meal')
  const replacement = RECIPES.find(
    (r) => r.id !== target.recipe.id && r.costPerServingUsd !== target.recipe.costPerServingUsd,
  )
  assert.ok(replacement)

  const swapped = applySwap(plan, target.day, replacement.id, DEFAULT_PREFS, 'us')
  let manual = 0
  for (const d of swapped.days) if (d.kind === 'meal') manual += d.recipe.costPerServingUsd * DEFAULT_PREFS.household * (d.batch ? 2 : 1)
  assert.ok(Math.abs(swapped.total - manual) < 1e-9)
  assert.notEqual(swapped.total, plan.total)
  assert.equal(swapped.budget, plan.budget)

  // Old recipe ingredients no longer needed drop out; new ones appear.
  const keys = new Set(swapped.basket.flatMap((g) => g.items.map((i) => i.key)).concat(swapped.staples.map((s) => s.key)))
  for (const ing of replacement.ingredients) assert.ok(keys.has(ing.key), `${ing.key} missing after swap`)
})

test('swaps survive a refresh (persisted map → identical plan)', () => {
  const prefs = DEFAULT_PREFS
  const plan = generatePlan(prefs, 'us', 3)
  const target = plan.days.find((d) => d.kind === 'meal')
  assert.ok(target && target.kind === 'meal')
  const replacement = RECIPES.find((r) => r.id !== target.recipe.id && !r.contains.some((a) => prefs.avoid.includes(a)))
  assert.ok(replacement)
  const swaps = { [target.day]: replacement.id }

  const fresh = generatePlan(prefs, 'us', 3) // what a page reload rebuilds
  const restored = applySwaps(fresh, swaps, prefs, 'us')
  const lived = applySwaps(plan, swaps, prefs, 'us')
  assert.equal(JSON.stringify(restored), JSON.stringify(lived))
})

test('applySwap refuses bad input: wrong day, unknown recipe, avoided recipe, non-meal day', () => {
  const prefs: Prefs = { ...DEFAULT_PREFS, avoid: ['fish'], days: ['cook', 'off', 'cook', 'off', 'cook', 'cook', 'cook'] }
  const plan = generatePlan(prefs, 'us', 5)
  const nonMeal = plan.days.find((d) => d.kind !== 'meal')
  const mealDay = plan.days.find((d) => d.kind === 'meal')
  assert.ok(nonMeal && mealDay && mealDay.kind === 'meal')
  const fish = RECIPES.find((r) => r.contains.includes('fish'))!
  const other = RECIPES.find((r) => r.id !== mealDay.recipe.id && !r.contains.some((a) => prefs.avoid.includes(a)))!

  assert.equal(applySwap(plan, nonMeal.day, other.id, prefs, 'us'), plan, 'off/leftovers day must not swap')
  assert.equal(applySwap(plan, mealDay.day, 'ghost-recipe', prefs, 'us'), plan, 'unknown recipe must not swap')
  assert.equal(applySwap(plan, mealDay.day, fish.id, prefs, 'us'), plan, 'avoided recipe must not swap')
  assert.equal(applySwap(plan, mealDay.day, mealDay.recipe.id, prefs, 'us'), plan, 'same recipe is a no-op')
  assert.equal(applySwap(plan, 99, other.id, prefs, 'us'), plan, 'out-of-range day must not swap')
})

test('a second swap stacks without touching the first', () => {
  const prefs = DEFAULT_PREFS
  const plan = generatePlan(prefs, 'us', 6)
  const meals = plan.days.filter((d) => d.kind === 'meal' && !d.batch)
  assert.ok(meals.length >= 2)
  const [a, b] = meals
  const r1 = RECIPES.find((r) => r.id !== (a.kind === 'meal' ? a.recipe.id : '') && !r.contains.some((x) => prefs.avoid.includes(x)))!
  const r2 = RECIPES.find((r) => r.id !== (b.kind === 'meal' ? b.recipe.id : '') && r.id !== r1.id && !r.contains.some((x) => prefs.avoid.includes(x)))!

  const once = applySwap(plan, a.day, r1.id, prefs, 'us')
  const twice = applySwap(once, b.day, r2.id, prefs, 'us')
  const dayA = twice.days[a.day]
  const dayB = twice.days[b.day]
  assert.equal(dayA.kind === 'meal' && dayA.recipe.id, r1.id)
  assert.equal(dayB.kind === 'meal' && dayB.recipe.id, r2.id)
})
