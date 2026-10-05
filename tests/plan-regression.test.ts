/**
 * Non-regression tests for the plan engine core.
 * These freeze the behaviour that MUST survive the Phase-1 changes:
 * determinism, structure, avoid filters, leftovers coherence, cost math,
 * basket completeness, day modes, week-note parsing.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_PREFS,
  DAYS,
  formatMoney,
  generatePlan,
  parseWeekNote,
  priceFor,
  type Prefs,
} from '../lib/pomme/plan.ts'
import { RECIPES, type Locale } from '../lib/pomme/recipes.ts'

const IDS = (prefs: Prefs, locale: Locale, seed: number) =>
  generatePlan(prefs, locale, seed).days.map((d) =>
    d.kind === 'meal' ? d.recipe.id : d.kind === 'leftovers' ? `L:${d.recipe.id}` : 'off',
  )

test('determinism: same (prefs, locale, seed) always yields the same plan', () => {
  for (const seed of [1, 2, 7]) {
    const a = generatePlan(DEFAULT_PREFS, 'us', seed)
    const b = generatePlan(DEFAULT_PREFS, 'us', seed)
    assert.equal(JSON.stringify(a), JSON.stringify(b))
  }
})

test('structure: 7 ordered days, dinners counted, off days respected', () => {
  const plan = generatePlan(DEFAULT_PREFS, 'us', 3)
  assert.equal(plan.days.length, 7)
  plan.days.forEach((d, i) => {
    assert.equal(d.day, i)
    assert.equal(i, DAYS.indexOf(DAYS[i]))
    if (DEFAULT_PREFS.days[i] === 'off') {
      assert.ok(d.kind === 'off' || d.kind === 'leftovers', `day ${i} should be off or leftovers, got ${d.kind}`)
    } else {
      assert.equal(d.kind, 'meal', `day ${i} should be a meal, got ${d.kind}`)
    }
  })
  assert.equal(plan.dinners, plan.days.filter((d) => d.kind === 'meal').length)
})

test('avoid: no meal ever contains an avoided item (multi-seed)', () => {
  const cases: Prefs[] = [
    { ...DEFAULT_PREFS, avoid: ['fish'] },
    { ...DEFAULT_PREFS, avoid: ['meat', 'fish', 'dairy'] },
    { ...DEFAULT_PREFS, avoid: ['mushroom', 'cilantro'] },
    { ...DEFAULT_PREFS, avoid: ['meat', 'fish', 'mushroom', 'cilantro', 'spicy', 'dairy'] },
  ]
  for (const prefs of cases) {
    for (let seed = 1; seed <= 6; seed++) {
      const plan = generatePlan(prefs, 'us', seed)
      for (const d of plan.days) {
        if (d.kind !== 'meal' && d.kind !== 'leftovers') continue
        for (const a of d.recipe.contains) {
          assert.ok(!prefs.avoid.includes(a), `${d.recipe.id} contains avoided "${a}" (seed ${seed})`)
        }
      }
    }
  }
})

test('leftovers: entry references its source meal, source is flagged batch', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const plan = generatePlan(DEFAULT_PREFS, 'us', seed)
    for (const d of plan.days) {
      if (d.kind !== 'leftovers') continue
      const source = plan.days[d.fromDay]
      assert.equal(source.kind, 'meal')
      assert.equal(source.recipe.id, d.recipe.id)
      assert.equal(source.batch, true)
      assert.ok(d.fromDay < d.day)
    }
  }
})

test('cost math: total equals Σ costPerServing × household × batch multiplier', () => {
  for (const household of [1, 2, 4, 6]) {
    for (const seed of [1, 5]) {
      const prefs = { ...DEFAULT_PREFS, household }
      const plan = generatePlan(prefs, 'us', seed)
      let manual = 0
      for (const d of plan.days) {
        if (d.kind !== 'meal') continue
        manual += priceFor(d.recipe.costPerServingUsd, 'us') * household * (d.batch ? 2 : 1)
      }
      assert.ok(Math.abs(plan.total - manual) < 1e-9, `household ${household} seed ${seed}`)
    }
  }
})

test('basket: every meal ingredient lands in basket or staples, grouped by aisle', () => {
  const plan = generatePlan(DEFAULT_PREFS, 'uk', 4)
  const covered = new Set<string>()
  for (const g of plan.basket) for (const it of g.items) covered.add(it.key)
  for (const s of plan.staples) covered.add(s.key)
  for (const d of plan.days) {
    if (d.kind !== 'meal') continue
    for (const ing of d.recipe.ingredients) {
      assert.ok(covered.has(ing.key), `ingredient ${ing.key} missing from basket/staples`)
    }
  }
  for (const g of plan.basket) {
    for (const it of g.items) {
      assert.equal(it.aisle, g.aisle)
      assert.equal(it.staple, false)
      assert.ok(it.meals >= 1)
    }
    assert.ok(g.items.length > 0)
  }
})

test('no cooked duplicate when the eligible pool covers every slot', () => {
  const eligible = RECIPES.filter((r) => !r.contains.some((a) => DEFAULT_PREFS.avoid.includes(a)))
  const slots = DEFAULT_PREFS.days.filter((d) => d !== 'off').length
  assert.ok(eligible.length >= slots)
  for (let seed = 1; seed <= 10; seed++) {
    const seen = new Set<string>()
    for (const d of generatePlan(DEFAULT_PREFS, 'us', seed).days) {
      if (d.kind !== 'meal') continue
      assert.ok(!seen.has(d.recipe.id), `duplicate ${d.recipe.id} at seed ${seed}`)
      seen.add(d.recipe.id)
    }
  }
})

test('notes: always one budget line; leftover note iff a leftovers day exists', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const plan = generatePlan(DEFAULT_PREFS, 'us', seed)
    const budgetNotes = plan.notes.filter((n) => /under your budget|over budget/.test(n))
    assert.equal(budgetNotes.length, 1)
    const leftoverNote = plan.notes.some((n) => /night off|makes enough/.test(n))
    const leftoverDay = plan.days.some((d) => d.kind === 'leftovers')
    assert.equal(leftoverNote, leftoverDay)
  }
})

test('locale pricing: UK totals are the USD total × 0.78', () => {
  const us = generatePlan(DEFAULT_PREFS, 'us', 2)
  const uk = generatePlan(DEFAULT_PREFS, 'uk', 2)
  assert.ok(Math.abs(uk.total - us.total * 0.78) < 1e-9)
  assert.ok(Math.abs(priceFor(10, 'uk') - 7.8) < 1e-9)
  assert.equal(formatMoney(90, 'us'), '$90')
  assert.equal(formatMoney(70, 'uk'), '£70')
})

test('week note parsing regression: money, people, days, diet, mood', () => {
  const n1 = parseWeekNote('vegan week, no mushrooms, £80 budget for 4 people, wednesday off', DEFAULT_PREFS, 'us')
  assert.equal(n1.locale, 'uk')
  assert.equal(n1.prefs.budget, 80)
  assert.equal(n1.prefs.household, 4)
  assert.equal(n1.prefs.days[2], 'off')
  assert.ok(n1.prefs.avoid.includes('meat') && n1.prefs.avoid.includes('dairy') && n1.prefs.avoid.includes('mushroom'))

  const n2 = parseWeekNote('busy week, just me, $60', DEFAULT_PREFS, 'us')
  assert.equal(n2.prefs.household, 1)
  assert.equal(n2.prefs.budget, 60)
  assert.ok(n2.prefs.days.every((d) => d !== 'cook'))

  const n3 = parseWeekNote('tired, relaxed saturday, no fish', DEFAULT_PREFS, 'us')
  assert.equal(n3.prefs.mood, 'easy')
  assert.equal(n3.prefs.days[5], 'cook')
  assert.ok(n3.prefs.avoid.includes('fish'))
})
