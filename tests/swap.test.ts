/**
 * Phase 2.4 — real meal swapping.
 * Mandated cases: recipe changed / grocery changed / total recalculated /
 * restrictions respected / deterministic state. Plus the picker contract:
 * never the same meal, never an avoided ingredient.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_PREFS,
  applySwap,
  applySwaps,
  generatePlan,
  planSignature,
  swapOptions,
  type Prefs,
} from '../lib/pomme/plan.ts'
import { RECIPES, type Avoid } from '../lib/pomme/recipes.ts'

const amounts = (plan: { basket: { items: { key: string; amount: number }[] }[]; staples: { key: string; amount: number }[] }) =>
  new Map(
    plan.basket
      .flatMap((g) => g.items)
      .concat(plan.staples)
      .map((it) => [it.key, it.amount] as const),
  )

test('2.4a swap → le repas change, exactement ce jour-là', () => {
  const prefs = DEFAULT_PREFS
  const plan = generatePlan(prefs, 'us', 4)
  const target = plan.days.find((d) => d.kind === 'meal' && !d.batch)
  assert.ok(target && target.kind === 'meal')
  const replacement = RECIPES.find((r) => r.id !== target.recipe.id && !r.contains.some((a) => prefs.avoid.includes(a)))!
  const swapped = applySwap(plan, target.day, replacement.id, prefs, 'us')
  const after = swapped.days[target.day]
  assert.equal(after.kind === 'meal' && after.recipe.id, replacement.id)
  assert.notEqual(after, target)
})

test('2.4b swap → la grocery est recalculée (anciennes quantités disparues)', () => {
  const prefs = DEFAULT_PREFS
  const plan = generatePlan(prefs, 'us', 4)
  const target = plan.days.find((d) => d.kind === 'meal' && !d.batch)
  assert.ok(target && target.kind === 'meal')
  const replacement = RECIPES.find(
    (r) => r.id !== target.recipe.id && !r.contains.some((a) => prefs.avoid.includes(a)) && r.ingredients.some((i) => !target.recipe.ingredients.some((t) => t.key === i.key)),
  )!
  const swapped = applySwap(plan, target.day, replacement.id, prefs, 'us')
  const before = amounts(plan)
  const after = amounts(swapped)
  // un ingrédient unique de l'ancien repas ne doit plus traîner
  const gone = target.recipe.ingredients.find((i) => !replacement.ingredients.some((r) => r.key === i.key) && !swapped.days.some((d) => d.kind === 'meal' && d.day !== target.day && d.recipe.ingredients.some((x) => x.key === i.key)))
  assert.ok(gone, 'le cas de test doit isoler un ingrédient sortant')
  assert.equal(after.has(gone.key), false, `${gone.key} résiduel après swap`)
  // un ingrédient du nouveau repas apparaît
  const added = replacement.ingredients.find((i) => !before.has(i.key))
  assert.ok(added, 'le nouveau repas doit apporter un ingrédient')
  assert.equal(after.has(added.key), true)
})

test('2.4c swap → total et budget recalculés au centime', () => {
  const prefs = DEFAULT_PREFS
  const plan = generatePlan(prefs, 'us', 4)
  const target = plan.days.find((d) => d.kind === 'meal' && !d.batch)
  assert.ok(target && target.kind === 'meal')
  const replacement = RECIPES.find((r) => r.id !== target.recipe.id && r.costPerServingUsd !== target.recipe.costPerServingUsd)!
  const swapped = applySwap(plan, target.day, replacement.id, prefs, 'us')
  let manual = 0
  for (const d of swapped.days) if (d.kind === 'meal') manual += d.recipe.costPerServingUsd * prefs.household * (d.batch ? 2 : 1)
  assert.ok(Math.abs(swapped.total - manual) < 1e-9)
  assert.notEqual(swapped.total, plan.total)
  assert.equal(swapped.budget, prefs.budget)
  const note = swapped.notes.find((n) => /under your budget|over budget/.test(n)) ?? ''
  assert.equal(/over budget/.test(note), swapped.total > swapped.budget)
})

test('2.4d swap → restrictions respectées (avoid, cook time honnête, leftovers)', () => {
  const prefs: Prefs = { ...DEFAULT_PREFS, avoid: ['fish'] as Avoid[], cookTime: 20 }
  const plan = generatePlan(prefs, 'us', 5)
  const target = plan.days.find((d) => d.kind === 'meal' && !d.batch)
  assert.ok(target && target.kind === 'meal')
  // swap vers une recette trop longue: autorisé mais JAMAIS silencieux
  const longOne = RECIPES.find((r) => r.time > 20 && !r.contains.some((a) => prefs.avoid.includes(a)))!
  const swapped = applySwap(plan, target.day, longOne.id, prefs, 'us')
  const after = swapped.days[target.day]
  assert.equal(after.kind === 'meal' && after.overTime, true, 'dépassement de temps doit être flaggé')
  assert.ok(swapped.warnings.some((w) => w.includes('beyond your usual cooking time')))
  // swap vers une recette évitée: refusé
  const fish = RECIPES.find((r) => r.contains.includes('fish'))!
  assert.equal(applySwap(plan, target.day, fish.id, prefs, 'us'), plan, 'recette évitée refusée')
  // leftovers: le repas de reste suit la source swappée
  const withLeft = generatePlan({ ...DEFAULT_PREFS, days: ['cook', 'off', 'cook', 'cook', 'cook', 'cook', 'cook'] }, 'us', 3)
  const source = withLeft.days.find((d) => d.kind === 'meal' && d.batch)
  if (source && source.kind === 'meal') {
    const rep = RECIPES.find((r) => r.id !== source.recipe.id && !r.contains.some((a) => DEFAULT_PREFS.avoid.includes(a)))!
    const sw = applySwap(withLeft, source.day, rep.id, DEFAULT_PREFS, 'us')
    for (const d of sw.days) {
      if (d.kind === 'leftovers' && d.fromDay === source.day) assert.equal(d.recipe.id, rep.id)
    }
  }
})

test('2.4e swap → état déterministe et restaurable', () => {
  const prefs = DEFAULT_PREFS
  const plan = generatePlan(prefs, 'us', 6)
  const target = plan.days.find((d) => d.kind === 'meal')!
  const replacement = RECIPES.find((r) => r.id !== (target.kind === 'meal' ? target.recipe.id : '') && !r.contains.some((a) => prefs.avoid.includes(a)))!
  const swaps = { [target.day]: replacement.id }
  const restored = applySwaps(generatePlan(prefs, 'us', 6), swaps, prefs, 'us')
  const lived = applySwaps(plan, swaps, prefs, 'us')
  assert.equal(JSON.stringify(restored), JSON.stringify(lived))
  assert.equal(planSignature(restored), planSignature(lived))
})

test('2.4f picker: jamais le même repas, jamais un évitement, ordre déterministe', () => {
  const avoid: Avoid[] = ['fish', 'mushroom']
  const options = swapOptions('tofu-stirfry', avoid)
  assert.ok(options.length > 0)
  assert.equal(options.some((r) => r.id === 'tofu-stirfry'), false, 'le repas courant ne doit jamais être proposé')
  assert.equal(options.some((r) => r.contains.some((a) => avoid.includes(a))), false, 'un évitement a fuité')
  assert.equal(JSON.stringify(options.map((r) => r.id)), JSON.stringify(swapOptions('tofu-stirfry', avoid).map((r) => r.id)))
  // sans repas courant: tout le pool compatible
  const all = swapOptions(null, [])
  assert.equal(all.length, RECIPES.length)
})
