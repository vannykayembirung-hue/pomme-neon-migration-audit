/**
 * Recipe data invariants for Phase 1: quantities, steps, variety and diet coverage.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RECIPES, type Avoid, type QtyUnit } from '../lib/pomme/recipes.ts'

const UNITS: QtyUnit[] = ['g', 'ml', 'tbsp', 'tsp', 'cans', 'packs', 'whole']
const DIET: Avoid[] = ['meat', 'fish', 'dairy']
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')

const veganCompatible = () =>
  RECIPES.filter((r) => !r.contains.some((a) => DIET.includes(a)))
const withEmptyContains = () => RECIPES.filter((r) => r.contains.length === 0)

test('pool size: at least 30 recipes with unique ids', () => {
  assert.ok(RECIPES.length >= 30, `only ${RECIPES.length} recipes`)
  const ids = RECIPES.map((r) => r.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate recipe ids')
})

test('diet coverage: at least 8 vegan-compatible recipes (no meat/fish/dairy)', () => {
  const v = veganCompatible()
  assert.ok(v.length >= 8, `only ${v.length} vegan-compatible recipes`)
})

test('diet coverage: all six exclusions leave enough meals for a full week', () => {
  const avoid: Avoid[] = ['meat', 'fish', 'mushroom', 'cilantro', 'spicy', 'dairy']
  const eligible = RECIPES.filter((r) => !r.contains.some((a) => avoid.includes(a)))
  assert.ok(eligible.length >= 7, `all-avoid pool is ${eligible.length}`)
  for (const single of avoid) {
    const pool = RECIPES.filter((r) => !r.contains.includes(single))
    assert.ok(pool.length >= 15, `avoid=${single} leaves only ${pool.length}`)
  }
})

test('time coverage: at least 7 recipes fit a 20-minute night', () => {
  const quick = RECIPES.filter((r) => r.time <= 20)
  assert.ok(quick.length >= 7, `only ${quick.length} recipes at ≤20 min`)
})

test('leftovers coverage: at least 5 batch-friendly recipes', () => {
  const batch = RECIPES.filter((r) => r.makesLeftovers)
  assert.ok(batch.length >= 5, `only ${batch.length} leftovers recipes`)
})

test('every ingredient carries a positive quantity and a known unit', () => {
  for (const r of RECIPES) {
    assert.ok(r.ingredients.length >= 4, `${r.id} has too few ingredients`)
    for (const ing of r.ingredients) {
      assert.ok(ing.qtyPerServing > 0, `${r.id}/${ing.key} qty=${ing.qtyPerServing}`)
      assert.ok(UNITS.includes(ing.unit), `${r.id}/${ing.key} unit=${ing.unit}`)
    }
  }
})

test('same ingredient key always uses the same unit across recipes', () => {
  const unitByKey = new Map<string, QtyUnit>()
  for (const r of RECIPES) {
    for (const ing of r.ingredients) {
      const seen = unitByKey.get(ing.key)
      if (seen) assert.equal(seen, ing.unit, `${ing.key} mixes ${seen} and ${ing.unit}`)
      else unitByKey.set(ing.key, ing.unit)
    }
  }
})

/**
 * Images still to be generated (daily generation cap). The UI renders a styled
 * fallback for these. Shrink this list to empty once all photos exist — the
 * test then enforces every file strictly.
 */
const PENDING_IMAGES = new Set([
  'prawn-stirfry',
])

test('every recipe has cookable steps and a real image file', () => {
  for (const r of RECIPES) {
    assert.ok(r.steps.length >= 4, `${r.id} has ${r.steps.length} steps`)
    for (const s of r.steps) assert.ok(s.length > 15, `${r.id} stub step: "${s}"`)
    assert.ok(r.time > 0 && r.costPerServingUsd > 0)
    assert.ok(r.moods.length >= 1)
    assert.match(r.image, /^\/images\/recipes\/[a-z0-9-]+\.webp$/)
    if (PENDING_IMAGES.has(r.id)) continue
    const file = path.join(publicDir, r.image.replace(/^\//, ''))
    assert.ok(existsSync(file), `${r.id} image missing: ${r.image}`)
  }
})

test('shared ingredient keys stay consistent (label + aisle)', () => {
  const byKey = new Map<string, { us: string; uk?: string; aisle: string }>()
  for (const r of RECIPES) {
    for (const ing of r.ingredients) {
      const seen = byKey.get(ing.key)
      if (seen) {
        assert.equal(seen.us, ing.us, `${ing.key} label drift`)
        assert.equal(seen.aisle, ing.aisle, `${ing.key} aisle drift`)
      } else byKey.set(ing.key, { us: ing.us, uk: ing.uk, aisle: ing.aisle })
    }
  }
})
