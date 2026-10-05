/**
 * Phase 2.1 — mandated engine matrix (A–L) + the two engine fixes:
 *  1. cook time is never violated silently (flag + warning when the pool is too small),
 *  2. a forced repeat is signalled — a repeated meal never counts as a new recipe,
 *  3. "Rework my plan" only ever returns a VERIFIED different seed when one exists.
 *
 * Existing suites stay untouched: plan-regression (10), plan-rules (15), recipes (9), persist (7).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_PREFS,
  findNextSeed,
  generatePlan,
  planSignature,
  priceFor,
  rebuildPlan,
  type DayMode,
  type PlanDay,
  type Prefs,
} from '../lib/pomme/plan.ts'
import { RECIPES, type Avoid, type Locale } from '../lib/pomme/recipes.ts'

const VEGAN: Avoid[] = ['meat', 'fish', 'dairy']
const ALL_TAGS: Avoid[] = ['meat', 'fish', 'mushroom', 'cilantro', 'spicy', 'dairy']
const slotsOf = (days: PlanDay[]) => days.filter((d) => d.kind === 'meal')
const countsOf = (days: PlanDay[]) => {
  const counts = new Map<string, number>()
  for (const d of slotsOf(days)) counts.set(d.recipe.id, (counts.get(d.recipe.id) ?? 0) + 1)
  return counts
}
const timeLimit = (d: PlanDay, prefs: Prefs) =>
  d.kind === 'meal' ? (d.mode === 'quick' ? 20 : prefs.cookTime) : Infinity

// ── A. génération normale ─────────────────────────────────────────────────────

test('A. génération normale: semaine structurée, recettes réelles, comptes cohérents', () => {
  for (const locale of ['us', 'uk'] as Locale[]) {
    for (let seed = 1; seed <= 5; seed++) {
      const plan = generatePlan(DEFAULT_PREFS, locale, seed)
      assert.equal(plan.days.length, 7)
      plan.days.forEach((d, i) => assert.equal(d.day, i))
      for (const d of slotsOf(plan.days)) {
        assert.ok(RECIPES.some((r) => r.id === d.recipe.id), `unknown recipe ${d.recipe.id}`)
        assert.ok(d.recipe.time > 0 && d.recipe.ingredients.length > 0)
      }
      assert.equal(plan.dinners, slotsOf(plan.days).length)
      assert.ok(plan.total > 0 && plan.activeMinutes > 0)
      assert.equal(plan.budget, DEFAULT_PREFS.budget)
      assert.equal(plan.servings, DEFAULT_PREFS.household)
    }
  }
})

// ── B. exclusions ─────────────────────────────────────────────────────────────

test('B. exclusions: aucun ingrédient évité ne fuite (matrice × 12 seeds)', () => {
  const combos: Avoid[][] = [[], ['fish'], ['meat', 'fish', 'dairy'], ['mushroom', 'cilantro'], ALL_TAGS]
  for (const avoid of combos) {
    const prefs: Prefs = { ...DEFAULT_PREFS, avoid }
    for (let seed = 1; seed <= 12; seed++) {
      for (const d of generatePlan(prefs, 'us', seed).days) {
        if (d.kind !== 'meal' && d.kind !== 'leftovers') continue
        for (const a of d.recipe.contains) {
          assert.ok(!avoid.includes(a), `${d.recipe.id} contient "${a}" évité (avoid=${avoid.join('+')}, seed ${seed})`)
        }
      }
    }
  }
})

// ── C. vegan ──────────────────────────────────────────────────────────────────

test('C. vegan: semaine variée, jamais un plat en boucle', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const plan = generatePlan({ ...DEFAULT_PREFS, avoid: VEGAN }, 'us', seed)
    const counts = countsOf(plan.days)
    assert.ok(counts.size >= 5, `seed ${seed}: ${counts.size} plats distincts seulement`)
    for (const [id, n] of counts) assert.ok(n <= 2, `${id} cuit ${n}× (seed ${seed})`)
    assert.equal(plan.warnings.length, 0, `pool sain mais warning: ${plan.warnings}`)
  }
})

test('C2. une répétition forcée est signalée — plus jamais une semaine « normalement variée »', () => {
  // vegan + cookTime 20: 5 recettes ≤20 min pour 6 créneaux → une répétition est
  // nécessaire, et doit être annoncée (avant le fix: 5/6 avec warnings: [] sur 10/10 seeds).
  const prefs: Prefs = { ...DEFAULT_PREFS, cookTime: 20, avoid: VEGAN }
  for (let seed = 1; seed <= 12; seed++) {
    const plan = generatePlan(prefs, 'us', seed)
    const counts = countsOf(plan.days)
    const slots = slotsOf(plan.days).length
    assert.ok(counts.size < slots, `seed ${seed}: le cas de test ne force plus de répétition (${counts.size}/${slots})`)
    assert.ok(
      plan.warnings.some((w) => w.includes('Limited variety')),
      `répétition forcée non signalée (seed ${seed}): ${plan.warnings}`,
    )
  }
})

// ── D. cookTime 20 ────────────────────────────────────────────────────────────

test('D. cookTime 20: respect strict quand le pool le permet (30 seeds)', () => {
  const prefs: Prefs = { ...DEFAULT_PREFS, cookTime: 20 }
  for (let seed = 1; seed <= 30; seed++) {
    for (const d of generatePlan(prefs, 'us', seed).days) {
      if (d.kind !== 'meal') continue
      assert.ok(d.recipe.time <= 20, `${d.recipe.id} ${d.recipe.time}m dépasse 20 (seed ${seed})`)
    }
  }
})

test('D2. cookTime: jamais violé silencieusement quand le pool est insuffisant', () => {
  // Pool de 10 (contains=[]) avec 12 créneaux cook et limite 20 min: la capacité
  // on-time (2×5) ne couvre pas tout → le fallback doit déborder ET le signaler.
  const days: DayMode[] = Array.from({ length: 12 }, () => 'cook' as DayMode)
  const prefs: Prefs = { ...DEFAULT_PREFS, days, cookTime: 20, avoid: ALL_TAGS }
  let overflowsSeen = 0
  for (let seed = 1; seed <= 10; seed++) {
    const plan = generatePlan(prefs, 'us', seed)
    const overflows = slotsOf(plan.days).filter((d) => d.recipe.time > timeLimit(d, prefs))
    overflowsSeen += overflows.length
    for (const d of slotsOf(plan.days)) {
      const over = d.recipe.time > timeLimit(d, prefs)
      assert.equal(d.overTime, over, `${d.recipe.id} mal flaggé (seed ${seed})`)
    }
    if (overflows.length > 0) {
      assert.ok(
        plan.warnings.some((w) => w.includes('beyond your usual cooking time')),
        `débordement non signalé (seed ${seed}): ${plan.warnings}`,
      )
    }
  }
  assert.ok(overflowsSeen > 0, 'le cas de test ne force plus de débordement — à revoir')
})

// ── E. cookTime 30 ────────────────────────────────────────────────────────────

test('E. cookTime 30: strict sur les nuits cook, quick ≤20 min', () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (const d of generatePlan(DEFAULT_PREFS, 'us', seed).days) {
      if (d.kind !== 'meal') continue
      const limit = d.mode === 'quick' ? 20 : 30
      assert.ok(d.recipe.time <= limit, `${d.recipe.id} ${d.recipe.time}m sur ${d.mode} (seed ${seed})`)
    }
  }
})

// ── F. household 1 → 6 ────────────────────────────────────────────────────────

test('F. household 1→6: portions, coût et quantités exacts pour chaque taille', () => {
  // La composition peut légitimement varier avec le foyer (pression budget par
  // portion dans le scoring) — ce qui est garanti et audité, c'est la cohérence
  // exacte portions/coût/quantités pour CHAQUE taille de foyer.
  for (let household = 1; household <= 6; household++) {
    const prefs: Prefs = { ...DEFAULT_PREFS, household }
    const plan = generatePlan(prefs, 'us', 4)
    assert.equal(plan.servings, household)
    let manual = 0
    const expected = new Map<string, number>()
    for (const d of plan.days) {
      if (d.kind !== 'meal') continue
      const servings = household * (d.batch ? 2 : 1)
      manual += priceFor(d.recipe.costPerServingUsd, 'us') * servings
      for (const ing of d.recipe.ingredients) {
        expected.set(ing.key, (expected.get(ing.key) ?? 0) + ing.qtyPerServing * servings)
      }
    }
    assert.ok(Math.abs(plan.total - manual) < 1e-9, `coût household ${household}: ${plan.total} ≠ ${manual}`)
    const actual = new Map<string, number>()
    for (const group of plan.basket) for (const item of group.items) actual.set(item.key, item.amount)
    for (const s of plan.staples) actual.set(s.key, s.amount)
    assert.equal(actual.size, expected.size, `lignes panier household ${household}`)
    for (const [key, amount] of expected) {
      assert.ok(Math.abs((actual.get(key) ?? 0) - amount) < 1e-9, `${key} household ${household}: ${actual.get(key)} ≠ ${amount}`)
    }
  }
})

// ── G. budget ─────────────────────────────────────────────────────────────────

test('G. budget: plan.budget = source de vérité, note ↔ réalité (us + uk)', () => {
  for (const locale of ['us', 'uk'] as Locale[]) {
    for (const budget of [40, 75, 130, 220]) {
      const plan = generatePlan({ ...DEFAULT_PREFS, budget }, locale, 3)
      assert.equal(plan.budget, budget)
      const note = plan.notes.find((n) => /under your budget|over budget/.test(n)) ?? ''
      assert.equal(/over budget/.test(note), plan.total > plan.budget, `${locale} budget ${budget}: ${note}`)
    }
  }
})

// ── H. jours off ──────────────────────────────────────────────────────────────

test('H. jours off: jamais un repas cuisiné sur un jour off (12 seeds)', () => {
  const prefs: Prefs = { ...DEFAULT_PREFS, days: ['cook', 'off', 'quick', 'off', 'cook', 'cook', 'off'] }
  for (let seed = 1; seed <= 12; seed++) {
    const plan = generatePlan(prefs, 'us', seed)
    plan.days.forEach((d, i) => {
      if (prefs.days[i] !== 'off') return
      assert.notEqual(d.kind, 'meal', `jour ${i} off mais cuisiné (seed ${seed})`)
      assert.ok(d.kind === 'off' || d.kind === 'leftovers')
    })
  }
})

// ── I. leftovers ──────────────────────────────────────────────────────────────

test('I. leftovers: source référencée, batch posé, note présente', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const plan = generatePlan(DEFAULT_PREFS, 'us', seed)
    const leftovers = plan.days.filter((d): d is Extract<PlanDay, { kind: 'leftovers' }> => d.kind === 'leftovers')
    for (const left of leftovers) {
      const source = plan.days[left.fromDay]
      assert.equal(source.kind, 'meal')
      assert.equal(source.recipe.id, left.recipe.id)
      assert.equal(source.batch, true)
      assert.ok(left.fromDay < left.day)
      assert.ok(plan.notes.some((n) => /makes enough/.test(n)), `note leftovers absente (seed ${seed})`)
    }
  }
})

// ── J. déterminisme ───────────────────────────────────────────────────────────

test('J. déterminisme: (prefs, locale, seed) → plan identique, byte pour byte', () => {
  const cases: [Prefs, Locale, number][] = [
    [DEFAULT_PREFS, 'us', 1],
    [DEFAULT_PREFS, 'uk', 7],
    [{ ...DEFAULT_PREFS, avoid: VEGAN, cookTime: 20 }, 'us', 4],
    [{ ...DEFAULT_PREFS, household: 6, days: ['cook', 'cook', 'cook', 'off', 'off', 'quick', 'cook'] }, 'uk', 9],
  ]
  for (const [prefs, locale, seed] of cases) {
    const a = JSON.stringify(generatePlan(prefs, locale, seed))
    const b = JSON.stringify(generatePlan(prefs, locale, seed))
    assert.equal(a, b)
  }
})

// ── K. Rework avec changement de seed ─────────────────────────────────────────

test('K. rework: findNextSeed renvoie toujours une semaine différente quand c\'est possible', () => {
  const combos: Prefs[] = [
    DEFAULT_PREFS,
    { ...DEFAULT_PREFS, avoid: VEGAN },
    { ...DEFAULT_PREFS, cookTime: 20 },
    { ...DEFAULT_PREFS, avoid: ALL_TAGS },
    { ...DEFAULT_PREFS, household: 1, days: ['cook', 'off', 'cook', 'off', 'cook', 'off', 'cook'] },
    { ...DEFAULT_PREFS, household: 6, mood: 'fresh' },
  ]
  for (const prefs of combos) {
    for (let start = 1; start <= 25; start++) {
      const previous = planSignature(generatePlan(prefs, 'us', start))
      const next = findNextSeed(prefs, 'us', start + 1, previous)
      assert.notEqual(planSignature(generatePlan(prefs, 'us', next)), previous, `rework stérile depuis seed ${start}`)
    }
  }
})

test('K2. rework enchaîné: 6 reworks d\'affilée changent chacun la semaine', () => {
  let seed = 1
  let signature = planSignature(generatePlan(DEFAULT_PREFS, 'us', seed))
  for (let step = 0; step < 6; step++) {
    seed = findNextSeed(DEFAULT_PREFS, 'us', seed + 1, signature)
    const next = planSignature(generatePlan(DEFAULT_PREFS, 'us', seed))
    assert.notEqual(next, signature, `étape ${step} sans changement`)
    signature = next
  }
})

test('K3. rework: déterministe, borné, et ne renvoie jamais une graine non testée', () => {
  const previous = planSignature(generatePlan(DEFAULT_PREFS, 'us', 1))
  const a = findNextSeed(DEFAULT_PREFS, 'us', 2, previous)
  const b = findNextSeed(DEFAULT_PREFS, 'us', 2, previous)
  assert.equal(a, b, 'findNextSeed doit être déterministe')
  assert.ok(a >= 2)
  // Sans plan précédent, la graine demandée fait foi.
  assert.equal(findNextSeed(DEFAULT_PREFS, 'us', 5, null), 5)
  // maxTries=1: le résultat est soit une graine vérifiée différente, soit la
  // graine elle-même (changement impossible en 1 essai) — jamais start+1 non testée.
  const once = findNextSeed(DEFAULT_PREFS, 'us', 2, previous, 1)
  assert.ok(once === 2 || planSignature(generatePlan(DEFAULT_PREFS, 'us', once)) !== previous)
})

// ── L. grocery list cohérente avec le plan ────────────────────────────────────

test('L. panier = exactement Σ qtyPerServing × portions des repas du plan', () => {
  const prefs: Prefs = { ...DEFAULT_PREFS, household: 3 }
  for (let seed = 1; seed <= 8; seed++) {
    const plan = generatePlan(prefs, 'us', seed)
    const expected = new Map<string, number>()
    for (const d of plan.days) {
      if (d.kind !== 'meal') continue
      const servings = prefs.household * (d.batch ? 2 : 1)
      for (const ing of d.recipe.ingredients) {
        expected.set(ing.key, (expected.get(ing.key) ?? 0) + ing.qtyPerServing * servings)
      }
    }
    const actual = new Map<string, number>()
    for (const g of plan.basket) for (const it of g.items) actual.set(it.key, it.amount)
    for (const s of plan.staples) actual.set(s.key, s.amount)
    assert.equal(actual.size, expected.size, `seed ${seed}: ${actual.size} lignes ≠ ${expected.size} ingrédients`)
    for (const [key, amount] of expected) {
      assert.ok(actual.has(key), `${key} manquant (seed ${seed})`)
      assert.ok(Math.abs((actual.get(key) ?? 0) - amount) < 1e-9, `${key}: ${actual.get(key)} ≠ ${amount}`)
    }
  }
})

test('L2. après swap, le panier suit le repas remplacé', () => {
  const prefs = DEFAULT_PREFS
  const plan = generatePlan(prefs, 'us', 5)
  const target = slotsOf(plan.days)[0]
  const replacement = RECIPES.find((r) => r.id !== target.recipe.id && !r.contains.some((a) => prefs.avoid.includes(a)))
  assert.ok(replacement)
  const rebuilt = rebuildPlan(
    plan.days.map((d): PlanDay =>
      d.day === target.day && d.kind === 'meal' ? { ...d, recipe: replacement } : d,
    ),
    prefs,
    'us',
  )
  const expected = new Map<string, number>()
  for (const d of rebuilt.days) {
    if (d.kind !== 'meal') continue
    const servings = prefs.household * (d.batch ? 2 : 1)
    for (const ing of d.recipe.ingredients) {
      expected.set(ing.key, (expected.get(ing.key) ?? 0) + ing.qtyPerServing * servings)
    }
  }
  const actual = new Map<string, number>()
  for (const g of rebuilt.basket) for (const it of g.items) actual.set(it.key, it.amount)
  for (const s of rebuilt.staples) actual.set(s.key, s.amount)
  for (const [key, amount] of expected) {
    assert.ok(Math.abs((actual.get(key) ?? 0) - amount) < 1e-9, `${key} désaligné après swap`)
  }
})
