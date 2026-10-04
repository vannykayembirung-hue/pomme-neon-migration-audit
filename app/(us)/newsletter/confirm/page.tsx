import type { Metadata } from 'next'
import Link from 'next/link'
import { peekPending } from '@/lib/admin/subscribers'
import { confirmSubscription } from '../actions'

export const metadata: Metadata = { title: 'Confirm your subscription', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  const valid = await peekPending(token)
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-cream px-5 text-oxblood">
      {valid ? (
        <>
          <h1 className="text-4xl font-black tracking-tight">One last tap.</h1>
          <p className="mt-3 text-lg">Confirm and we will send one quiet email on Sunday mornings. You can stop whenever you like.</p>
          <form action={confirmSubscription} className="mt-8">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="min-h-12 rounded-xl bg-oxblood px-6 font-bold text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood">
              Yes, send me Sunday
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-black tracking-tight">That link has expired.</h1>
          <p className="mt-3 text-lg">Try subscribing again from the Pomme homepage and we will send a fresh link.</p>
        </>
      )}
      <Link href="/" className="mt-8 font-bold underline underline-offset-4">
        Back to Pomme
      </Link>
    </main>
  )
}
