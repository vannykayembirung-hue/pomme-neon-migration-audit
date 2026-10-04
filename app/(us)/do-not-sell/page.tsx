import type { Metadata } from 'next'
import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/site'
import { DoNotSellActions } from './actions'

export const metadata: Metadata = { title: 'Do Not Sell or Share My Personal Information' }

export default function DoNotSell() {
  return (
    <main id="main" className="mx-auto min-h-dvh max-w-2xl bg-cream px-5 py-16 text-oxblood">
      <h1 className="text-3xl font-black tracking-tight">Do Not Sell or Share My Personal Information</h1>
      <p className="mt-4 leading-relaxed">
        Pomme does not sell your personal information. We only share data with advertising partners (Meta and TikTok) if
        you choose Marketing cookies, and that choice is off by default. Use the button below to switch it off at any time.
      </p>
      <DoNotSellActions />
      <p className="mt-6 text-sm">
        To ask us to delete anything we hold about you, email{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline">
          {CONTACT_EMAIL}
        </a>
        .{' '}
        <Link href="/" className="font-bold underline">
          Back to Pomme
        </Link>
      </p>
    </main>
  )
}
