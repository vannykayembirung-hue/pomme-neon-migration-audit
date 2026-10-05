/**
 * Phase 2.2 — grocery quantities and calculation.
 * Mission matrix (18 mandated cases): per-serving quantities, household scaling,
 * aggregation on the canonical key, safe unit conversion (kg→g, l→ml), leftovers
 * counted once, staples, cost coherence, US/UK, determinism.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_PREFS,
  applySwaps,
  formatMoney,
  formatQty,
  generatePlan,
  rebuildPlan,
  type PlanDay,
  type Prefs,
} from '../lib/pomme/plan.ts'
import {
  RECIPES,
  localName,
  type Aisle,
  type Ingredient,
  type QtyUnit,
  type Recipe,
} from '../lib/pomme/recipes.ts'

// ── fixtures ─────────────────────────────────────────────────────────────────

type Spec = { key: string; qty: number; unit: QtyUnit; staple?: boolean; us?: string; uk?: string }

const craftRecipe = (id: string, specs: Spec[]): Recipe => ({
  id,
  name: { us: id },
  time: 20,
  costPerServingUsd: 2,
  moods: [],
  contains: [],
  makesLeftovers: false,
  image: '',
  steps: [],
  ingredients: specs.map(
    (s): Ingredient => ({
      key: s.key,
      us: s.us ?? s.key,
      uk: s.uk,
      aisle: 'pantry' as Aisle,
      staple: s.staple,
      qtyPerServing: s.qty,
      unit: s.unit,
    }),
  ),
})

const mealDay = (day: number, recipe: Recipe, batch = false): PlanDay => ({
  day,
  kind: 'meal',
  mode: 'cook',
  recipe,
  batch,
  overTime: false,
})

const leftoversDay = (day: number, fromDay: number, recipe: Recipe): PlanDay => ({
  day,
  kind: 'leftovers',
  fromDay,
  recipe,
})

const allLines = (plan: { basket: { items: { key: string; amount: number; unit: QtyUnit }[] }[]; staples: { key: string; amount: number; unit: QtyUnit }[] }) =>
  plan.basket.flatMap((g) => g.items).concat(plan.staples)

const amountOf = (
  plan: { basket: { items: { key: string; amount: number; unit: QtyUnit }[] }[]; staples: { key: string; amount: number; unit: QtyUnit }[] },
  key: string,
) => {
  const lines = allLines(plan).filter((l) => l.key === key || l.key.startsWith(`${key}-`))
  return lines.reduce((sum, l) => sum + l.amount, 0)
}

const basePrefs = (overrides: Partial<Prefs>): Prefs => ({ ...DEFAULT_PREFS, ...overrides })

// ── 1. Une recette seule ─────────────────────────────────────────────────────

test('1. une recette seule: montant = qtyPerServing × household', () => {
  const recipe = craftRecipe('solo', [
    { key: 'chicken', qty: 120, unit: 'g' },
    { key: 'olive-oil', qty: 1, unit: 'tbsp', staple: true },
  ])
  for (const household of [1, 3]) {
    const plan = rebuildPlan([mealDay(0, recipe)], basePrefs({ household }), 'us')
    assert.equal(amountOf(plan, 'chicken'), 120 * household)
    assert.equal(amountOf(plan, 'olive-oil'), 1 * household)
  }
})

// ── 2. Deux recettes partageant le même ingrédient ───────────────────────────

test('2. deux recettes, même ingrédient: une seule ligne qui additionne', () => {
  const a = craftRecipe('a', [{ key: 'chicken', qty: 200, unit: 'g' }])
  const b = craftRecipe('b', [{ key: 'chicken', qty: 300, unit: 'g' }])
  const plan = rebuildPlan([mealDay(0, a), mealDay(1, b)], basePrefs({ household: 1 }), 'us')
  const lines = allLines(plan).filter((l) => l.key.startsWith('chicken'))
  assert.equal(lines.length, 1, 'deux lignes pour le même ingrédient')
  assert.equal(lines[0].amount, 500)
  assert.equal(lines[0].unit, 'g')
})

// ── 3. Trois recettes partageant le même ingrédient ──────────────────────────

test('3. trois recettes, même ingrédient: 200 + 300 + 250 = 750 g', () => {
  const a = craftRecipe('a', [{ key: 'chicken', qty: 200, unit: 'g' }])
  const b = craftRecipe('b', [{ key: 'chicken', qty: 300, unit: 'g' }])
  const c = craftRecipe('c', [{ key: 'chicken', qty: 250, unit: 'g' }])
  const plan = rebuildPlan([mealDay(0, a), mealDay(1, b), mealDay(2, c)], basePrefs({ household: 1 }), 'us')
  const lines = allLines(plan).filter((l) => l.key.startsWith('chicken'))
  assert.equal(lines.length, 1)
  assert.equal(lines[0].amount, 750)
})

// ── 4-7. Household 1 / 2 / 4 / 6 ─────────────────────────────────────────────

test('4-7. household 1/2/4/6: quantités et coût scalent avec les portions réelles', () => {
  const a = craftRecipe('a', [
    { key: 'chicken', qty: 120, unit: 'g' },
    { key: 'pasta', qty: 100, unit: 'g' },
    { key: 'olive-oil', qty: 1, unit: 'tbsp', staple: true },
  ])
  for (const household of [1, 2, 4, 6]) {
    const days = [mealDay(0, a), mealDay(1, a, true), leftoversDay(2, 1, a)]
    const plan = rebuildPlan(days, basePrefs({ household }), 'us')
    // jour 1 batch = quantité réellement préparée pour deux repas (×2), leftovers = 0
    assert.equal(amountOf(plan, 'chicken'), 120 * household + 120 * household * 2)
    assert.equal(amountOf(plan, 'pasta'), 100 * household + 100 * household * 2)
    assert.equal(amountOf(plan, 'olive-oil'), 1 * household + 1 * household * 2)
    let manualCost = 0
    for (const d of plan.days) if (d.kind === 'meal') manualCost += 2 * household * (d.batch ? 2 : 1)
    assert.ok(Math.abs(plan.total - manualCost) < 1e-9, `coût household ${household}`)
    assert.equal(plan.servings, household)
  }
})

// ── 8. Conversion g → kg ─────────────────────────────────────────────────────

test('8. conversion g→kg: agrégation en g, affichage en kg au-dessus d\'1 kg', () => {
  const kg = craftRecipe('kg', [{ key: 'chicken', qty: 0.2, unit: 'kg' }])
  const g = craftRecipe('g', [{ key: 'chicken', qty: 300, unit: 'g' }])
  const plan = rebuildPlan([mealDay(0, kg), mealDay(1, g)], basePrefs({ household: 1 }), 'us')
  const lines = allLines(plan).filter((l) => l.key.startsWith('chicken'))
  assert.equal(lines.length, 1, '0.2 kg et 300 g doivent s\'additionner')
  assert.equal(lines[0].amount, 500)
  assert.equal(lines[0].unit, 'g')
  assert.equal(formatQty(lines[0].amount, lines[0].unit), '500 g')
  assert.equal(formatQty(1200, 'g'), '1.2 kg')
  assert.equal(formatQty(0.5, 'kg'), '500 g')
  assert.equal(formatQty(1.25, 'kg'), '1.3 kg')
})

// ── 9. Conversion ml → l ─────────────────────────────────────────────────────

test('9. conversion ml→l: agrégation en ml, affichage en l au-dessus d\'1 l', () => {
  const l = craftRecipe('l', [{ key: 'stock', qty: 0.5, unit: 'l' }])
  const ml = craftRecipe('ml', [{ key: 'stock', qty: 300, unit: 'ml' }])
  const plan = rebuildPlan([mealDay(0, l), mealDay(1, ml)], basePrefs({ household: 1 }), 'us')
  const lines = allLines(plan).filter((l2) => l2.key.startsWith('stock'))
  assert.equal(lines.length, 1, '0.5 l et 300 ml doivent s\'additionner')
  assert.equal(lines[0].amount, 800)
  assert.equal(lines[0].unit, 'ml')
  assert.equal(formatQty(lines[0].amount, lines[0].unit), '800 ml')
  assert.equal(formatQty(1250, 'ml'), '1.3 l')
  assert.equal(formatQty(1.5, 'l'), '1.5 l')
})

// ── 10. Unités incompatibles ─────────────────────────────────────────────────

test('10. unités incompatibles: jamais d\'addition — deux lignes séparées', () => {
  const tbsp = craftRecipe('tbsp', [{ key: 'olive-oil', qty: 2, unit: 'tbsp' }])
  const g = craftRecipe('g', [{ key: 'olive-oil', qty: 100, unit: 'g' }])
  const plan = rebuildPlan([mealDay(0, tbsp), mealDay(1, g)], basePrefs({ household: 1 }), 'us')
  const lines = allLines(plan).filter((l) => l.key.startsWith('olive-oil'))
  assert.equal(lines.length, 2, 'tbsp et g ne doivent jamais fusionner')
  assert.deepEqual(lines.map((l) => l.amount).sort((x, y) => x - y), [2, 100])
  const units = lines.map((l) => l.unit).sort()
  assert.deepEqual(units, ['g', 'tbsp'])
})

// ── 11. Staples ──────────────────────────────────────────────────────────────

test('11. staples: séparés du panier, quantifiés quand calculables', () => {
  const recipe = craftRecipe('r', [
    { key: 'chicken', qty: 150, unit: 'g' },
    { key: 'soy', qty: 1, unit: 'tbsp', staple: true },
    { key: 'olive-oil', qty: 1, unit: 'tbsp', staple: true },
  ])
  const plan = rebuildPlan([mealDay(0, recipe)], basePrefs({ household: 2 }), 'us')
  assert.equal(plan.basket.flatMap((g) => g.items).some((it) => it.key.startsWith('soy')), false)
  assert.equal(plan.staples.length, 2)
  assert.equal(amountOf({ basket: [], staples: plan.staples }, 'soy'), 2)
  assert.equal(amountOf({ basket: [], staples: plan.staples }, 'olive-oil'), 2)
  // Données réelles: chaque staple d'un plan généré a une quantité strictement positive.
  const real = generatePlan(DEFAULT_PREFS, 'us', 3)
  for (const s of real.staples) assert.ok(s.amount > 0, `${s.key} sans quantité`)
})

// ── 12. Leftovers ────────────────────────────────────────────────────────────

test('12. leftovers: jamais comptés deux fois', () => {
  const curry = craftRecipe('curry', [{ key: 'chicken', qty: 200, unit: 'g' }])
  const withLeft = rebuildPlan([mealDay(0, curry, true), leftoversDay(1, 0, curry)], basePrefs({ household: 2 }), 'us')
  const withoutLeft = rebuildPlan([mealDay(0, curry, true), { day: 1, kind: 'off' }], basePrefs({ household: 2 }), 'us')
  // cuisiné une fois pour deux repas: qty × household × 2 — identique avec ou sans jour leftovers
  assert.equal(amountOf(withLeft, 'chicken'), 800)
  assert.equal(amountOf(withLeft, 'chicken'), amountOf(withoutLeft, 'chicken'))
  // Un plan avec leftovers ne double rien côté coût non plus.
  assert.ok(Math.abs(withLeft.total - withoutLeft.total) < 1e-9)
})

// ── 13. Batch cooking ────────────────────────────────────────────────────────

test('13. batch cooking: portion doublée sur le repas batché, jamais ailleurs', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const prefs = basePrefs({ days: ['cook', 'off', 'cook', 'off', 'off', 'off', 'off'] })
    const plan = generatePlan(prefs, 'us', seed)
    const batched = plan.days.filter((d) => d.kind === 'meal' && d.batch)
    assert.ok(batched.length >= 1, `seed ${seed}: aucun batch`)
    let manual = 0
    for (const d of plan.days) {
      if (d.kind !== 'meal') continue
      const servings = prefs.household * (d.batch ? 2 : 1)
      for (const ing of d.recipe.ingredients) manual += ing.qtyPerServing * servings
    }
    const total = allLines(plan).reduce((sum, l) => sum + l.amount, 0)
    assert.ok(Math.abs(total - manual) < 1e-9, `seed ${seed}: ${total} ≠ ${manual}`)
  }
})

// ── 14. Grocery list ↔ plan ──────────────────────────────────────────────────

test('14. panier = image exacte du plan (multi-seeds, foyers et locales)', () => {
  for (const household of [1, 2, 4, 6]) {
    for (const locale of ['us', 'uk'] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const prefs = basePrefs({ household })
        const plan = generatePlan(prefs, locale, seed)
        const expected = new Map<string, number>()
        for (const d of plan.days) {
          if (d.kind !== 'meal') continue
          const servings = household * (d.batch ? 2 : 1)
          for (const ing of d.recipe.ingredients) {
            const amount = ing.unit === 'kg' || ing.unit === 'l' ? ing.qtyPerServing * 1000 : ing.qtyPerServing
            expected.set(ing.key, (expected.get(ing.key) ?? 0) + amount * servings)
          }
        }
        for (const [key, amount] of expected) {
          assert.ok(Math.abs(amountOf(plan, key) - amount) < 1e-9, `${key} h${household} ${locale} seed ${seed}`)
        }
      }
    }
  }
})

// ── 15. Grocery quantities ↔ cost ────────────────────────────────────────────

test('15. quantités et coût partagent la même math de portions', () => {
  for (const household of [1, 2, 4, 6]) {
    const prefs = basePrefs({ household })
    for (let seed = 1; seed <= 6; seed++) {
      const plan = generatePlan(prefs, 'us', seed)
      let manualCost = 0
      for (const d of plan.days) {
        if (d.kind !== 'meal') continue
        manualCost += d.recipe.costPerServingUsd * household * (d.batch ? 2 : 1)
      }
      assert.ok(Math.abs(plan.total - manualCost) < 1e-9, `coût h${household} seed ${seed}`)
      assert.equal(plan.servings, household)
      assert.equal(plan.budget, prefs.budget)
    }
  }
})

// ── 16. Refresh / déterminisme ───────────────────────────────────────────────

test('16. refresh: mêmes entrées → panier et coût identiques, swaps reproductibles', () => {
  const prefs = basePrefs({ household: 3, avoid: ['fish'] })
  const a = generatePlan(prefs, 'uk', 5)
  const b = generatePlan(prefs, 'uk', 5)
  assert.equal(JSON.stringify(a.basket), JSON.stringify(b.basket))
  assert.equal(JSON.stringify(a.staples), JSON.stringify(b.staples))
  assert.equal(a.total, b.total)
  const swaps = { 0: 'tofu-stirfry' }
  const restored = applySwaps(generatePlan(prefs, 'uk', 5), swaps, prefs, 'uk')
  const lived = applySwaps(a, swaps, prefs, 'uk')
  assert.equal(JSON.stringify(restored.basket), JSON.stringify(lived.basket))
})

// ── 17. US ───────────────────────────────────────────────────────────────────

test('17. US: libellés et monnaie américains', () => {
  const plan = generatePlan(DEFAULT_PREFS, 'us', 2)
  assert.equal(formatMoney(plan.total, 'us').startsWith('$'), true)
  const onion = plan.basket.flatMap((g) => g.items).find((it) => it.key === 'onion')
  if (onion) assert.equal(onion.label, localName(RECIPES.flatMap((r) => r.ingredients).find((x) => x.key === 'onion')!, 'us'))
})

// ── 18. UK ───────────────────────────────────────────────────────────────────

test('18. UK: libellés locaux, monnaie £, coût × 0,78', () => {
  const us = generatePlan(DEFAULT_PREFS, 'us', 2)
  const uk = generatePlan(DEFAULT_PREFS, 'uk', 2)
  assert.equal(formatMoney(uk.total, 'uk').startsWith('£'), true)
  assert.ok(Math.abs(uk.total - us.total * 0.78) < 1e-9)
  const onionBase = RECIPES.flatMap((r) => r.ingredients).find((x) => x.key === 'onion')!
  assert.equal(localName(onionBase, 'uk'), 'Brown onion')
})
