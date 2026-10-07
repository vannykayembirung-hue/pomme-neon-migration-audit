'use client'

import { useSyncExternalStore } from 'react'
import { DAY_NAMES } from '@/lib/pomme/plan'
import { derivePlan } from '@/lib/pomme/derive'
import { STORAGE_KEY, parsePersisted } from '@/lib/pomme/persist'
import { localName } from '@/lib/pomme/recipes'

const subscribe = () => () => {}
const read = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function OfflinePlan() {
  const raw = useSyncExternalStore(subscribe, read, () => null)
  const state = parsePersisted(raw)
  if (!state || state.seed === 0) {
    return <p className="mt-4 text-oxblood/80">You haven&apos;t made a Sunday Plan yet. Come back online and Pomme will sort your week.</p>
  }
  const plan = derivePlan(state)
  if (!plan) {
    return <p className="mt-4 text-oxblood/80">You haven&apos;t made a Sunday Plan yet. Come back online and Pomme will sort your week.</p>
  }
  return (
    <ol className="mt-8 flex flex-col gap-3">
      {plan.days.map((entry) => (
        <li key={entry.day} className="rounded-2xl bg-white/70 px-4 py-3">
          <span className="font-bold">{DAY_NAMES[entry.day]}</span>
          <span className="ml-2 text-oxblood/80">
            {entry.kind === 'off' ? 'Night off' : entry.kind === 'leftovers' ? 'Leftovers' : localName(entry.recipe.name, state.locale)}
          </span>
        </li>
      ))}
    </ol>
  )
}
