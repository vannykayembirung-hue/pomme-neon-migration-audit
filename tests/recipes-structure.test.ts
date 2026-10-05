/**
 * Phase 2.3 — recipe model structure & non-regression.
 * A recipe must be really cookable: what you need, how much, how to prepare,
 * for how many. Every recipe in the catalogue is checked.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_PREFS, generatePlan, type Prefs } from '../lib/pomme/plan.ts'
import {
  AISLE_ORDER,
  RECIPES,
  type QtyUnit,
  type Recipe,
} from '../lib/pomme/recipes.ts'

const UNITS: QtyUnit[] = ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cans', 'packs', 'whole']

test('2.3a chaque recette est complète: identité, temps, coût, image, étapes', () => {
  const seen = new Set<string>()
  for (const r of RECIPES) {
    assert.ok(!seen.has(r.id), `id dupliqué ${r.id}`)
    seen.add(r.id)
    assert.ok(r.name.us.length > 0, `${r.id}: nom manquant`)
    assert.ok(r.time > 0, `${r.id}: time`)
    assert.ok(r.costPerServingUsd > 0, `${r.id}: coût`)
    assert.ok(r.image.startsWith('/images/'), `${r.id}: image`)
    assert.ok(r.steps.length >= 2, `${r.id}: ${r.steps.length} étapes`)
    assert.equal(new Set(r.steps).size, r.steps.length, `${r.id}: étapes dupliquées (clé React)`)
    for (const step of r.steps) assert.ok(step.trim().length > 10, `${r.id}: étape trop vide`)
  }
})

test('2.3b chaque ingrédient est calculable: clé, libellé, rayon, quantité, unité', () => {
  for (const r of RECIPES) {
    assert.ok(r.ingredients.length >= 2, `${r.id}: ${r.ingredients.length} ingrédients`)
    const keys = new Set<string>()
    for (const ing of r.ingredients) {
      assert.ok(ing.key.length > 0 && !keys.has(ing.key), `${r.id}/${ing.key}: clé`)
      keys.add(ing.key)
      assert.ok(ing.us.length > 0, `${r.id}/${ing.key}: libellé`)
      assert.ok(AISLE_ORDER.includes(ing.aisle), `${r.id}/${ing.key}: rayon ${ing.aisle}`)
      assert.ok(ing.qtyPerServing > 0, `${r.id}/${ing.key}: qtyPerServing`)
      assert.ok(UNITS.includes(ing.unit), `${r.id}/${ing.key}: unité inconnue ${ing.unit}`)
      if (ing.unit === 'kg' || ing.unit === 'l') {
        assert.ok(ing.qtyPerServing < 10, `${r.id}/${ing.key}: ${ing.qtyPerServing} ${ing.unit} hors norme`)
      }
    }
  }
})

test('2.3c champs optionnels: prep/cook positifs et cohérents quand présents, notes en texte', () => {
  for (const r of RECIPES) {
    if (r.prepMinutes != null) assert.ok(r.prepMinutes > 0, `${r.id}: prepMinutes`)
    if (r.cookMinutes != null) assert.ok(r.cookMinutes > 0, `${r.id}: cookMinutes`)
    if (r.prepMinutes != null && r.cookMinutes != null) {
      assert.ok(r.prepMinutes + r.cookMinutes >= r.time * 0.5, `${r.id}: prep+cook incohérent avec time`)
    }
    if (r.notes != null) assert.ok(r.notes.trim().length > 0, `${r.id}: notes vides`)
  }
})

test('2.3d la fiche recette est calculable: portions × quantités = panier du plan', () => {
  // The recipe card shows qtyPerServing × totalServings where totalServings =
  // household × (batch ? 2 : 1). It must match the plan engine exactly.
  for (const household of [1, 2, 4]) {
    const prefs: Prefs = { ...DEFAULT_PREFS, household }
    for (let seed = 1; seed <= 6; seed++) {
      const plan = generatePlan(prefs, 'us', seed)
      for (const d of plan.days) {
        if (d.kind !== 'meal') continue
        const totalServings = household * (d.batch ? 2 : 1)
        for (const ing of d.recipe.ingredients) {
          const inBasket = plan.basket
            .flatMap((g) => g.items)
            .concat(plan.staples)
            .find((it) => it.key === ing.key || it.key.startsWith(`${ing.key}-`))
          assert.ok(inBasket, `${ing.key} absent du panier`)
          // la ligne agrège plusieurs repas; la part de CE repas est qty × portions
          assert.ok(
            inBasket.amount >= ing.qtyPerServing * totalServings - 1e-9,
            `${ing.key}: ${inBasket.amount} < part du repas`,
          )
        }
      }
    }
  }
})

test('2.3e modèle: chaque recette passe par le contrat Recipe complet', () => {
  const contract: (keyof Recipe)[] = [
    'id',
    'name',
    'time',
    'costPerServingUsd',
    'moods',
    'contains',
    'makesLeftovers',
    'image',
    'ingredients',
    'steps',
  ]
  for (const r of RECIPES) {
    for (const field of contract) {
      assert.ok(r[field] !== undefined && r[field] !== null, `${r.id}: champ ${field} manquant`)
    }
  }
})
