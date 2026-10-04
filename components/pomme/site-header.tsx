'use client'

import { Logo } from './logo'
import { LocaleToggle } from './locale-toggle'

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#sunday-plan', label: 'Try it' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-oxblood/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <a href="#top" aria-label="Pomme home" className="text-cream">
          <Logo />
        </a>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-7 text-sm text-cream/75">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition-colors hover:text-cream">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <LocaleToggle tone="dark" />
          <a
            href="#sunday-plan"
            className="hidden rounded-full bg-apple px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:inline-flex"
          >
            Plan my week
          </a>
        </div>
      </div>
    </header>
  )
}
