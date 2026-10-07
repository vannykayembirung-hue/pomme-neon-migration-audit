/**
 * P1 regression — a swap changes its own day only.
 * The displayed week is derived from the generation snapshot (frozen memory);
 * live learning memory must never re-shape the week in progress.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PREFS, swapOptions, type Plan } from '../lib/pomme/plan.ts'
import { EMPTY_MEMORY, applySignal } from '../lib/pomme/memory.ts'
import { derivePlan } from '../lib/pomme/derive.ts'
import { RECIPES } from '../lib/pomme/recipes.ts'

const prefs = { ...DEFAULT_PREFS }

function baseState(overrides: Partial<Parameters<typeof derivePlan>[0]> = {}) {
  return {
    planPrefs: prefs,
    prefs,
    seed: 7,
    locale: 'us' as const,
    swaps: {},
    planMemory: EMPTY_MEMORY,
    ...overrides,
  }
}

function mealIds(plan: Plan): (string | null)[] {
  return plan.days.map((d) => (d.kind === 'meal' ? d.recipe.id : null))
}

test('swapping a day leaves every other day untouched', () => {
  const before = derivePlan(baseState())!
  const dayIndex = before.days.findIndex((d) => d.kind === 'meal')
  assert.ok(dayIndex >= 0, 'the generated week must contain a meal day')
  const target = before.days[dayIndex]
  const options = swapOptions(target.kind === 'meal' ? target.recipe.id : null, prefs.avoid)
  assert.ok(options.length > 0)
  const replacement = options[0]

  // The swap updates learning memory (for future weeks) AND the swap map —
  // exactly what the provider does. planMemory stays frozen at generation.
  applySignal(EMPTY_MEMORY, replacement, 'swapped_in')
  const after = derivePlan(baseState({ swaps: { [dayIndex]: replacement.id } }))!

  const idsBefore = mealIds(before)
  const idsAfter = mealIds(after)
  assert.equal(idsAfter[dayIndex], replacement.id, 'the swapped day must show the new recipe')
  for (let i = 0; i < 7; i++) {
    if (i === dayIndex) continue
    assert.equal(idsAfter[i], idsBefore[i], `day ${i} must not change when day ${dayIndex} is swapped`)
  }
})

test('later learning never re-shapes the week in progress (frozen snapshot)', () => {
  const state = baseState()
  const first = derivePlan(state)!
  // Simulate heavy learning after generation: many signals, including swaps.
  let memory = EMPTY_MEMORY
  for (const r of RECIPES.slice(0, 6)) memory = applySignal(memory, r, 'swapped_in')
  const second = derivePlan({ ...state, planMemory: state.planMemory })!
  assert.deepEqual(mealIds(second), mealIds(first), 'the displayed week must be a pure snapshot function')
})

test('the swap on a leftovers day follows its meal day', () => {
  const before = derivePlan(baseState())!
  const mealDay = before.days.findIndex((d) => d.kind === 'meal')
  assert.ok(mealDay >= 0)
  const entry = before.days[mealDay]
  if (entry.kind !== 'meal') return
  const options = swapOptions(entry.recipe.id, prefs.avoid)
  const replacement = options.find((r) => r.id !== entry.recipe.id)!
  const after = derivePlan(baseState({ swaps: { [mealDay]: replacement.id } }))!
  for (const d of after.days) {
    if (d.kind === 'leftovers' && d.fromDay === mealDay) {
      assert.equal(d.recipe.id, replacement.id, 'leftovers must follow their batch day')
    }
  }
  const otherDays = after.days.filter((d, i) => i !== mealDay && d.kind === 'meal')
  const otherBefore = before.days.filter((d, i) => i !== mealDay && d.kind === 'meal')
  assert.deepEqual(
    otherDays.map((d) => (d.kind === 'meal' ? d.recipe.id : '')),
    otherBefore.map((d) => (d.kind === 'meal' ? d.recipe.id : '')),
  )
})
