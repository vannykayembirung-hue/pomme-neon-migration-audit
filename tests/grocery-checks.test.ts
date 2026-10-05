/**
 * Phase 2.2 (mission 14) — grocery checklist state + rework recalculation.
 *
 * Test matrix mapping (all 12 mandated cases):
 *  TEST 1  (1 person)  ............ grocery.test.ts '1. une recette seule'
 *  TEST 2  (2 people) ............ grocery.test.ts '4-7. household 1/2/4/6'
 *  TEST 3  (4 people) ............ grocery.test.ts '4-7. household 1/2/4/6'
 *  TEST 4  (3 recipes, 1 key) .... grocery.test.ts '3. trois recettes… 750 g'
 *  TEST 5  (g/kg) ................ grocery.test.ts '8. conversion g→kg'
 *  TEST 6  (leftovers) ........... grocery.test.ts '12. leftovers: jamais comptés deux fois'
 *  TEST 7  (rework recalc) ....... below
 *  TEST 8  (checkbox F5) ......... below
 *  TEST 9  (reset week) .......... below
 *  TEST 10 (UK) .................. grocery.test.ts '18. UK' + plan-regression locale tests
 *  TEST 11 (US) .................. grocery.test.ts '17. US' + plan-regression locale tests
 *  TEST 12 (cost coherence) ...... grocery.test.ts '15. quantités et coût partagent la même math'
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_PREFS,
  findNextSeed,
  generatePlan,
  planSignature,
  type Plan,
} from '../lib/pomme/plan.ts'
import {
  STORAGE_KEY,
  createPommeStore,
  defaultState,
  parsePersisted,
  type PommeState,
} from '../lib/pomme/persist.ts'

const lineAmounts = (plan: Plan) => {
  const map = new Map<string, number>()
  for (const item of plan.basket.flatMap((g) => g.items).concat(plan.staples)) {
    map.set(item.key, (map.get(item.key) ?? 0) + item.amount)
  }
  return map
}

const expectedAmounts = (plan: Plan, household: number) => {
  const map = new Map<string, number>()
  for (const d of plan.days) {
    if (d.kind !== 'meal') continue
    const servings = household * (d.batch ? 2 : 1)
    for (const ing of d.recipe.ingredients) {
      map.set(ing.key, (map.get(ing.key) ?? 0) + ing.qtyPerServing * servings)
    }
  }
  return map
}

// ── TEST 7. Rework my plan → grocery entièrement recalculée ─────────────────

test('TEST 7. rework: la grocery est recalculée depuis le nouveau plan, sans résidu', () => {
  const prefs = DEFAULT_PREFS
  let seed = 1
  let signature = planSignature(generatePlan(prefs, 'us', seed))
  for (let step = 0; step < 6; step++) {
    seed = findNextSeed(prefs, 'us', seed + 1, signature)
    const plan = generatePlan(prefs, 'us', seed)
    signature = planSignature(plan)
    // 1) chaque ligne = exactement l'usage du plan courant (recalcul complet)
    const actual = lineAmounts(plan)
    const expected = expectedAmounts(plan, prefs.household)
    assert.deepEqual([...actual.entries()].sort(), [...expected.entries()].sort(), `étape ${step}: panier ≠ plan`)
    // 2) aucune clé orpheline d'un plan précédent
    for (const key of actual.keys()) {
      assert.ok(expected.has(key), `clé résiduelle ${key} à l'étape ${step}`)
    }
    // 3) coût et panier viennent bien de la même semaine
    assert.equal(plan.budget, prefs.budget)
    assert.ok(plan.total > 0)
  }
})

// ── TEST 8. Checkbox → survit au refresh ────────────────────────────────────

type StorageMock = {
  getItem: (k: string) => string | null
  setItem: (k: string, v: string) => void
  removeItem: (k: string) => void
  raw: () => string | undefined
}

const makeStorage = (): StorageMock => {
  const data: Record<string, string> = {}
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
    removeItem: (k) => {
      delete data[k]
    },
    raw: () => data[STORAGE_KEY],
  }
}

const withWindow = (storage: StorageMock, fn: () => void) => {
  const g = globalThis as unknown as { window?: unknown }
  const previous = g.window
  g.window = {
    localStorage: storage,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  try {
    fn()
  } finally {
    g.window = previous
  }
}

test('TEST 8. checkbox: cochées avant F5, toujours cochées après', () => {
  const storage = makeStorage()
  withWindow(storage, () => {
    const store = createPommeStore('us')
    store.update((s: PommeState) => ({ ...s, seed: 1, checkedGroceryItems: ['chicken-thighs', 'onion'] }))
    // le payload persisté contient bien les cases cochées (c'est ce que F5 recharge)
    assert.ok(storage.raw()?.includes('chicken-thighs'))
    // "F5": un nouveau store lit la même clé de stockage
    const reloaded = createPommeStore('us')
    assert.deepEqual(reloaded.getSnapshot().checkedGroceryItems, ['chicken-thighs', 'onion'])
    // mécanisme pur: le round-trip parsePersisted conserve la liste
    const parsed = parsePersisted(storage.raw() ?? null)
    assert.deepEqual(parsed?.checkedGroceryItems, ['chicken-thighs', 'onion'])
    // rétrocompatible: un ancien état sans le champ garde les autres données et donne []
    const legacy = JSON.stringify({ version: 1, savedAt: Date.now(), locale: 'us', prefs: DEFAULT_PREFS, seed: 3, swaps: {} })
    const legacyParsed = parsePersisted(legacy)
    assert.equal(legacyParsed?.seed, 3)
    assert.deepEqual(legacyParsed?.checkedGroceryItems, [])
  })
})

// ── TEST 9. Reset week → checkbox reset ─────────────────────────────────────

test('TEST 9. reset week: toutes les checkboxes sont réinitialisées', () => {
  const storage = makeStorage()
  withWindow(storage, () => {
    const store = createPommeStore('us')
    store.update((s: PommeState) => ({ ...s, seed: 1, checkedGroceryItems: ['onion', 'rice'] }))
    assert.equal(store.getSnapshot().checkedGroceryItems.length, 2)
    store.reset()
    assert.deepEqual(store.getSnapshot().checkedGroceryItems, [])
    assert.deepEqual(defaultState('us').checkedGroceryItems, [])
    // le stockage est purgé: un F5 après reset ne ressuscite rien
    const reloaded = createPommeStore('us')
    assert.deepEqual(reloaded.getSnapshot().checkedGroceryItems, [])
  })
})
