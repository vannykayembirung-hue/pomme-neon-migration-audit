import Link from 'next/link'

export const CTA_HREF = '/?utm_source=organic&utm_medium=seo&utm_campaign=mealime_orphans#sunday-plan'

export function Article({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-dvh bg-cream px-5 py-14 text-oxblood">
      <article className="mx-auto max-w-2xl">
        <Link href="/?utm_source=organic&utm_medium=seo&utm_campaign=mealime_orphans" className="text-sm font-bold underline underline-offset-4">
          Pomme
        </Link>
        <h1 className="mt-6 text-balance text-4xl font-black lowercase leading-tight tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-pretty text-xl leading-relaxed">{intro}</p>
        <div className="mt-8 flex flex-col gap-5 text-lg leading-relaxed [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-tight [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
        <aside className="mt-12 rounded-3xl bg-oxblood p-7 text-cream">
          <h2 className="text-2xl font-black lowercase">give pomme one minute this sunday.</h2>
          <p className="mt-2">Tell her how your week looks and get dinners, a grocery list and a budget back.</p>
          <Link href={CTA_HREF} className="mt-5 inline-block rounded-2xl bg-apple px-6 py-3 font-bold text-cream hover:brightness-110">
            Make my Sunday Plan
          </Link>
        </aside>
      </article>
    </main>
  )
}
