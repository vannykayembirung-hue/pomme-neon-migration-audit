import type { Metadata } from 'next'
import Link from 'next/link'
import { POSTAL_ADDRESS } from '@/lib/admin/email-templates'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata: Metadata = { title: 'Privacy notice' }

export default function Privacy() {
  return (
    <main id="main" className="mx-auto min-h-dvh max-w-2xl bg-cream px-5 py-16 text-oxblood">
      <h1 className="text-3xl font-black tracking-tight">Privacy notice</h1>
      <div className="mt-5 flex flex-col gap-4 leading-relaxed">
        <p>
          <strong>What we keep on your device.</strong> Your Sunday Plan and preferences are saved in your browser so they
          are there next time. They are not sent to us.
        </p>
        <p>
          <strong>Newsletter.</strong> If you subscribe, we hold your email address and region only to send the Sunday
          newsletter. We ask you to confirm first and every email has an unsubscribe link. Until you confirm, we keep the
          address for at most 48 hours.
        </p>
        <p>
          <strong>Cookies and measurement.</strong> Analytics and marketing cookies are off unless you switch them on.
          Change your mind any time from Cookie settings in the footer.
        </p>
        <p>
          <strong>Your rights.</strong> You can ask us to access or delete your data. Contact us at the address below.
        </p>
        <p className="text-sm">
          {POSTAL_ADDRESS}
          <br />
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
        </p>
        <Link href="/" className="font-bold underline">
          Back to Pomme
        </Link>
      </div>
    </main>
  )
}
