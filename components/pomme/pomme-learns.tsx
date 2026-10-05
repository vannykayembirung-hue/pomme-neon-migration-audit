const WEEKS = [
  { week: 'Week 1', title: 'You’ll tell her the basics.', body: 'Who’s eating, roughly what you spend, what you’d never touch.' },
  { week: 'Week 2', title: 'She’ll notice the skips.', body: 'Wednesday’s recipe went untouched. Twice. Noted.' },
  { week: 'Week 3', title: 'She’ll find your rhythm.', body: 'Fridays are for one pan and fifteen minutes. Sundays can be slow.' },
  { week: 'Week 4', title: 'She’ll plan before you ask.', body: 'The plan arrives already shaped like your life.' },
]

const MESSAGES = [
  'No cooking on Wednesdays. I’ve planned leftovers from Monday instead.',
  'Kept Friday to 15 minutes. You always seem to want that.',
  'You’re nearly out of miso, so I’ve added it to the basket.',
]

export function PommeLearns() {
  return (
    <section aria-labelledby="learns-title" className="relative overflow-hidden bg-oxblood py-20 text-cream sm:py-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(50%_60%_at_85%_20%,#4a0e16_0%,transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-leaf">The part that stays with you</p>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cream/80">Coming to Pomme Plus</span>
          </div>
          <h2
            id="learns-title"
            className="mt-3 text-balance text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl"
          >
            Soon, after four weeks, Pomme just gets it.
          </h2>
          <ol className="mt-10 flex flex-col gap-6 border-l border-white/10 pl-6">
            {WEEKS.map((item, index) => (
              <li key={item.week} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[31px] top-1.5 size-3 rounded-full ring-4 ring-oxblood ${
                    index === WEEKS.length - 1 ? 'bg-apple' : 'bg-cream/30'
                  }`}
                />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/50">{item.week}</p>
                <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-cream/70">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative">
          <div className="rounded-[2rem] bg-white/[0.05] p-5 ring-1 ring-white/10 sm:p-7">
            <div className="flex items-center justify-between text-xs text-cream/55">
              <span className="font-semibold text-cream">Preview · Your Sunday Plan · Week 4</span>
              <span>Sun 6:00 pm</span>
            </div>
            <ul className="mt-6 flex flex-col gap-3">
              {MESSAGES.map((message, index) => (
                <li
                  key={message}
                  className="max-w-[90%] rounded-2xl rounded-tl-md bg-cream px-4 py-3 text-sm leading-relaxed text-oxblood shadow-lg"
                  style={{ marginLeft: `${index * 4}%` }}
                >
                  {message}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex justify-end">
              <p className="rounded-2xl rounded-br-md bg-apple px-4 py-3 font-script text-3xl leading-none text-cream">
                Pomme knows me.
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-cream/60">
            Your preferences stay private and belong to you. Pomme only uses them to make next week easier.
          </p>
        </div>
      </div>
    </section>
  )
}
