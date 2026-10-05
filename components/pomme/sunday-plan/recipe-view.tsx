'use client'

import { useEffect, useRef } from 'react'
import { Clock, Users, X } from 'lucide-react'
import { formatQty, formatMoney } from '@/lib/pomme/plan'
import { localName, type Locale, type Recipe } from '@/lib/pomme/recipes'
import { RecipeImage } from './recipe-image'

/**
 * Cookable recipe card: ingredients with real quantities, steps, time, portions.
 * Opens from any meal on the plan. Existing dialog styling, nothing new invented.
 */
export function RecipeView({
  recipe,
  servings,
  batch,
  locale,
  onClose,
}: {
  recipe: Recipe | null
  servings: number
  batch: boolean
  locale: Locale
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (recipe) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [recipe])

  const totalServings = recipe ? servings * (batch ? 2 : 1) : 0

  return (
    <dialog
      ref={ref}
      aria-label={recipe ? `Recipe: ${localName(recipe.name, locale)}` : 'Recipe'}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[2rem] bg-cream p-0 text-oxblood shadow-2xl backdrop:bg-oxblood/75 backdrop:backdrop-blur-sm"
    >
      {recipe && (
        <div>
          <div className="relative">
            <RecipeImage
              src={recipe.image}
              alt=""
              width={1024}
              height={559}
              sizes="512px"
              className="h-52 w-full object-cover"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close recipe"
              className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full bg-oxblood/70 text-cream transition hover:bg-oxblood"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-6 sm:p-7">
            <h3 className="text-balance text-2xl font-black leading-tight tracking-tight">
              {localName(recipe.name, locale)}
            </h3>
            <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-oxblood/75">
              <div className="flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden="true" />
                <dd>
                  {recipe.prepMinutes != null && recipe.cookMinutes != null
                    ? `Prep ${recipe.prepMinutes} min · Cook ${recipe.cookMinutes} min`
                    : `${recipe.time} min`}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="size-4" aria-hidden="true" />
                <dd>
                  Serves {totalServings}
                  {batch ? ' (makes extra)' : ''}
                </dd>
              </div>
              <dd className="font-semibold">≈{formatMoney(recipe.costPerServingUsd * totalServings, locale)}</dd>
            </dl>

            <h4 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-oxblood/60">Ingredients</h4>
            <ul className="mt-2 flex flex-col divide-y divide-oxblood/10">
              {recipe.ingredients.map((ing) => (
                <li key={ing.key} className="flex items-baseline gap-3 py-2 text-sm">
                  <span className="w-24 shrink-0 font-semibold tabular-nums">
                    {formatQty(ing.qtyPerServing * totalServings, ing.unit)}
                  </span>
                  <span className="flex-1">{localName(ing, locale)}</span>
                </li>
              ))}
            </ul>

            <h4 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-oxblood/60">Method</h4>
            <ol className="mt-2 flex flex-col gap-3">
              {recipe.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-oxblood text-xs font-bold text-cream">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {recipe.notes && (
              <p className="mt-6 rounded-2xl bg-oxblood/5 px-4 py-3 text-sm text-oxblood/80">{recipe.notes}</p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-oxblood px-6 font-bold text-cream transition hover:brightness-110"
            >
              Back to my week
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
