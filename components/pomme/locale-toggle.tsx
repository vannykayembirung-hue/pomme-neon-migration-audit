'use client'

import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/pomme/recipes'
import { usePomme } from './pomme-provider'

const OPTIONS: { value: Locale; label: string; full: string }[] = [
  { value: 'us', label: 'US', full: 'United States, US dollars' },
  { value: 'uk', label: 'UK', full: 'United Kingdom, British pounds' },
]

export function LocaleToggle({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { locale, setLocale } = usePomme()
  return (
    <div
      role="radiogroup"
      aria-label="Region and currency"
      className={cn(
        'inline-flex rounded-full p-0.5 text-xs font-semibold',
        tone === 'dark' ? 'bg-white/10 text-cream/70' : 'bg-secondary text-muted-foreground',
      )}
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.full}
            onClick={() => setLocale(opt.value)}
            className={cn(
              'rounded-full px-2.5 py-1 transition',
              active &&
                (tone === 'dark' ? 'bg-cream text-oxblood' : 'bg-foreground text-cream'),
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
