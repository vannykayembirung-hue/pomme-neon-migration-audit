import type { Metadata } from 'next'
import { AccountPanel } from '@/components/pomme/account-panel'

export const metadata: Metadata = { title: 'Your account' }

export default function AccountPage() {
  return (
    <main id="main" className="mx-auto min-h-dvh max-w-2xl bg-cream px-5 py-16 text-oxblood">
      <h1 className="text-3xl font-black tracking-tight">Your account</h1>
      <p className="mt-3 leading-relaxed">
        Keep your Sunday Plan anywhere you cook. Your week is saved to your account and comes back on every device —
        without an account, it simply stays on this device.
      </p>
      <div className="mt-8">
        <AccountPanel />
      </div>
    </main>
  )
}
