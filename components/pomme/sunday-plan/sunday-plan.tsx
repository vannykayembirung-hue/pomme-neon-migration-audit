import { PlanForm } from './plan-form'
import { PlanResult } from './plan-result'

export function SundayPlan() {
  return (
    <section id="sunday-plan" aria-labelledby="plan-title" className="scroll-mt-16 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-apple">Try it now</p>
          <h2
            id="plan-title"
            className="mt-3 text-balance text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl"
          >
            Your Sunday Plan is on us.
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            No account, no card. Tell Pomme a little about your week and see what it feels like to have it handled.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <PlanForm />
          <PlanResult />
        </div>
      </div>
    </section>
  )
}
