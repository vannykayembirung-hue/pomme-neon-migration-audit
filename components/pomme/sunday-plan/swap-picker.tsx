'use client'

import { useEffect, useRef } from 'react'
import { Clock, X } from 'lucide-react'
import { formatMoney, swapOptions } from '@/lib/pomme/plan'
import { localName, type Locale, type Recipe } from '@/lib/pomme/recipes'
import { RecipeImage } from './recipe-image'

/**
 * Pick a replacement meal for one day. Shows only recipes that respect the
 * user's exclusions and never the meal already on that day.
 */
export function SwapPicker({
  open,
  currentRecipeId,
  avoid,
  locale,
  onPick,
  onClose,
}: {
  open: boolean
  currentRecipeId: string | null
  avoid: string[]
  locale: Locale
  onPick: (recipe: Recipe) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  const options = swapOptions(currentRecipeId, avoid).sort((a, b) =>
    localName(a.name, locale).localeCompare(localName(b.name, locale)),
  )

  return (
    <dialog
      ref={ref}
      aria-label="Swap this meal"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[2rem] bg-cream p-0 text-oxblood shadow-2xl backdrop:bg-oxblood/75 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 p-6 pb-3">
        <div>
          <p className="font-script text-3xl leading-none text-apple">swap this meal</p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight">What would you rather eat?</h2>
          <p className="mt-1 text-sm text-oxblood/70">Everything else on your week stays exactly as it is.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-oxblood/10 transition hover:bg-oxblood/20"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <ul className="flex flex-col gap-1 px-4 pb-5">
        {options.map((recipe) => (
          <li key={recipe.id}>
            <button
              type="button"
              onClick={() => onPick(recipe)}
              className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-oxblood/5"
            >
              <RecipeImage
                src={recipe.image}
                alt=""
                width={112}
                height={112}
                sizes="56px"
                className="size-14 shrink-0 rounded-xl object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold leading-snug">{localName(recipe.name, locale)}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-oxblood/65">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {recipe.time} min
                  <span aria-hidden="true">·</span>
                  {formatMoney(recipe.costPerServingUsd, locale)}/serving
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  )
}
