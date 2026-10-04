import type { Metadata } from 'next'
import { isAdmin, isDevAutoLogin } from '@/lib/admin/auth'
import { getMetrics } from '@/lib/admin/metrics'
import { AdminLogin } from './login'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-oxblood/10">
      <h2 className="text-sm font-bold uppercase tracking-wide text-oxblood/70">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-3xl font-black tabular-nums">{value}</p>
    <p className="text-xs text-oxblood/70">{label}</p>
  </div>
)

function Tally({ rows }: { rows: [string, number][] }) {
  if (!rows.length) return <p className="text-sm text-oxblood/70">Nothing yet.</p>
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {rows.map(([k, n]) => (
        <li key={k} className="flex justify-between">
          <span>{k}</span>
          <span className="font-bold tabular-nums">{n}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin configured={!!process.env.ADMIN_TOKEN} />
  const m = await getMetrics()
  return (
    <main id="main" className="min-h-dvh bg-cream px-5 py-10 text-oxblood">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black tracking-tight">Pomme admin</h1>
        {isDevAutoLogin() && (
          <p className="mt-2 rounded-xl bg-oxblood px-3 py-2 text-sm text-cream">Development mode: signed in automatically.</p>
        )}
        <p className="mt-2 text-sm text-oxblood/70">
          Counts only include visitors who accepted analytics cookies, so they under-report real use.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Sunday Plans generated">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="7 days" value={m.plans.week} />
              <Stat label="30 days" value={m.plans.month} />
              <Stat label="All time" value={m.plans.all} />
            </div>
          </Card>
          <Card title="Newsletter">
            <Stat label="Confirmed subscribers" value={m.newsletter.subscribers} />
          </Card>
          <Card title="Cookie consent">
            <Stat label={`Accepted (all or some) of ${m.consent.total} choices`} value={m.consent.acceptRatePct === null ? 'n/a' : `${m.consent.acceptRatePct}%`} />
          </Card>
          <Card title="Top moods">
            <Tally rows={m.moods} />
          </Card>
          <Card title="Paywall opens by reason">
            <Tally rows={m.paywallByReason} />
          </Card>
          <Card title="Shares by channel">
            <Tally rows={m.shares} />
          </Card>
          <div className="sm:col-span-2 lg:col-span-3">
            <Card title="Last 20 events">
              {m.recent.length === 0 ? (
                <p className="text-sm text-oxblood/70">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-oxblood/10 text-sm">
                  {m.recent.map((e, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2 py-1.5">
                      <span className="font-bold">{e.type}</span>
                      <span>{e.detail ?? ''}</span>
                      <span className="uppercase">{e.locale}</span>
                      <time dateTime={e.at} className="text-oxblood/70">{new Date(e.at).toLocaleString('en-GB')}</time>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Card title="Last emails sent">
              {m.sent.length === 0 ? (
                <p className="text-sm text-oxblood/70">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-oxblood/10 text-sm">
                  {m.sent.map((s, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2 py-1.5">
                      <span>{s.kind}</span>
                      <span>{s.email.replace(/^(.).*(@.*)$/, '$1***$2')}</span>
                      <time dateTime={s.at}>{new Date(s.at).toLocaleString('en-GB')}</time>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
