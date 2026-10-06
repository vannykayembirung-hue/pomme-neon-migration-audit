import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BillingSuccess } from '@/components/pomme/billing-success'

export const metadata: Metadata = { title: 'Payment', robots: { index: false, follow: false } }

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BillingSuccess />
    </Suspense>
  )
}
