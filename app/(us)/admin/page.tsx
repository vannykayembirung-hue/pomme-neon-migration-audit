import type { Metadata } from 'next'
import Link from 'next/link'
import { isAdmin, isDevAutoLogin } from '@/lib/admin/auth'
import { getMetrics, type RangeLocale } from '@/lib/admin/metrics'
import { AdminLogin } from './login'
import { ForgetButton } from './forget-button'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

function Card({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-oxblood/10 ${wide ? 'lg:col-span-3' : ''}`}>
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
        <li key={k} className="flex justify-between gap-3">
          <span className="truncate">{k}</span>
          <span className="font-bold tabular-nums">{n}</span>
        </li>
      ))}
    </ul>
  )
}

/** Zero-dependency SVG bars — server-rendered, tooltips on hover. */
function Bars({ series }: { series: { day: string; n: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.n))
  return (
    <div>
      <svg viewBox={`0 0 ${Math.max(1, series.length) * 10} 36`} preserveAspectRatio="none" className="h-24 w-full text-oxblood">
        {series.map((s, i) => (
          <rect
            key={s.day}
            x={i * 10 + 1}
            width={8}
            y={36 - Math.max(1, (s.n / max) * 32)}
            height={Math.max(1, (s.n / max) * 32)}
            rx={2}
            fill="currentColor"
          >
            <title>{`${s.day}: ${s.n}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-oxblood/60">
        <span>{series[0]?.day.slice(5)}</span>
        <span>{series[series.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  )
}

function Funnel({ steps }: { steps: [string, number][] }) {
  const max = Math.max(1, ...steps.map(([, n]) => n))
  return (
    <ul className="flex flex-col gap-3">
      {steps.map(([label, n], i) => {
        const w = Math.max(2, Math.round((n / max) * 100))
        const conv = i === 0 || steps[i - 1][1] === 0 ? null : Math.round((n / steps[i - 1][1]) * 100)
        return (
          <li key={label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold">{label}</span>
              <span className="tabular-nums">
                {n}
                {conv !== null && <span className="text-oxblood/60"> · {conv}%</span>}
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-oxblood/10">
              <div className="h-2.5 rounded-full bg-oxblood/80" style={{ width: `${w}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
        active ? 'bg-oxblood text-cream' : 'bg-oxblood/10 text-oxblood hover:bg-oxblood/20'
      }`}
    >
      {children}
    </Link>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>> | Record<string, string | string[]>
}) {
  if (!(await isAdmin())) return <AdminLogin configured={!!process.env.ADMIN_TOKEN} />
  const sp = (await Promise.resolve(searchParams)) ?? {}
  const range = [7, 30, 90].includes(Number(sp.range)) ? Number(sp.range) : 30
  const locale = (['all', 'us', 'uk'].includes(String(sp.locale)) ? String(sp.locale) : 'all') as RangeLocale
  const m = await getMetrics(range, locale)
  const href = (r: number, l: string) => `?range=${r}&locale=${l}`
  const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <main id="main" className="min-h-dvh bg-cream px-5 py-10 text-oxblood">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black tracking-tight">Pomme admin</h1>
        {isDevAutoLogin() && (
          <p className="mt-2 rounded-xl bg-oxblood px-3 py-2 text-sm text-cream">Development mode: signed in automatically.</p>
        )}
        <p className="mt-2 text-sm text-oxblood/70">
          Analytics include only visitors who accepted analytics cookies, so they under-report real use. Operational blocks are
          always current.
        </p>

        {/* Filters */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {[7, 30, 90].map((r) => (
            <Pill key={r} href={href(r, locale)} active={r === range}>
              {r} days
            </Pill>
          ))}
          <span className="mx-1 h-5 w-px bg-oxblood/20" />
          {(['all', 'us', 'uk'] as const).map((l) => (
            <Pill key={l} href={href(range, l)} active={l === locale}>
              {l === 'all' ? 'US + UK' : l.toUpperCase()}
            </Pill>
          ))}
        </div>

        {/* ── ANALYTICS ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title={`Traffic · last ${range} days`}>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Visits" value={m.kpis.visits} />
              <Stat label="Page views" value={m.kpis.pageViews} />
              <Stat label="Returning visits" value={m.kpis.returningPct === null ? 'n/a' : `${m.kpis.returningPct}%`} />
              <Stat label="Planned per visit" value={m.kpis.perVisitPlanPct === null ? 'n/a' : `${m.kpis.perVisitPlanPct}%`} />
            </div>
          </Card>
          <Card title="Activation funnel">
            <Funnel steps={m.funnel} />
          </Card>
          <Card title="Top pages">
            <Tally rows={m.topPages} />
          </Card>
          <Card title="Visits per day">
            <Bars series={m.series.visits} />
          </Card>
          <Card title="Weeks planned per day">
            <Bars series={m.series.plans} />
          </Card>
          <Card title="What people swap">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-leaf">Swapped in</p>
                <div className="mt-2">
                  <Tally rows={m.swapsIn} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-oxblood/60">Swapped out</p>
                <div className="mt-2">
                  <Tally rows={m.swapsOut} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── ACCOUNTS ── */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card title={`Accounts · ${m.accounts.length}`} wide>
            {m.accounts.length === 0 ? (
              <p className="text-sm text-oxblood/70">No accounts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-oxblood/10 text-left text-xs uppercase tracking-wide text-oxblood/60">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Member since</th>
                      <th className="py-2 pr-4">Last week saved</th>
                      <th className="py-2">Right to erasure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.accounts.map((a) => (
                      <tr key={a.email} className="border-b border-oxblood/5">
                        <td className="py-2 pr-4 font-bold">{a.email}</td>
                        <td className="py-2 pr-4 tabular-nums">{date(a.createdAt)}</td>
                        <td className="py-2 pr-4 tabular-nums">{a.savedAt ? date(a.savedAt) : '—'}</td>
                        <td className="py-2">
                          <ForgetButton email={a.email} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ── OPERATIONS ── */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Sunday Plans generated">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="7 days" value={m.plans.week} />
              <Stat label="30 days" value={m.plans.month} />
              <Stat label="All time" value={m.plans.all} />
            </div>
          </Card>
          <Card title="Newsletter">
            <Stat label="Confirmed subscribers" value={m.newsletter.subscribers} />
            <p className="mt-2 text-xs text-oxblood/70">{m.newsletter.pending} awaiting confirmation</p>
          </Card>
          <Card title="Email queue">
            {Object.keys(m.emailQueue).length === 0 ? (
              <p className="text-sm text-oxblood/70">Nothing yet.</p>
            ) : (
              <Tally rows={Object.entries(m.emailQueue).sort((a, b) => b[1] - a[1])} />
            )}
          </Card>
          <Card title="Cookie consent">
            <Stat
              label={`Accepted (all or some) of ${m.consent.total} choices`}
              value={m.consent.acceptRatePct === null ? 'n/a' : `${m.consent.acceptRatePct}%`}
            />
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
                      <time dateTime={e.at} className="text-oxblood/70">
                        {new Date(e.at).toLocaleString('en-GB')}
                      </time>
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
