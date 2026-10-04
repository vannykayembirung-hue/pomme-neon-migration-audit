import type { Metadata } from 'next'
import { OfflinePlan } from '@/components/pomme/offline-plan'

export const metadata: Metadata = { title: 'Offline', robots: { index: false } }

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto min-h-dvh max-w-xl bg-cream px-5 py-16 text-oxblood">
      <h1 className="text-3xl font-black tracking-tight">Pomme is offline. Your last plan is still here.</h1>
      <OfflinePlan />
    </main>
  )
}
