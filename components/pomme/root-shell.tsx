import { Archivo, Sacramento } from 'next/font/google'
import { CookieBanner } from '@/components/consent/cookie-banner'
import { TrackingScripts } from '@/components/consent/tracking-scripts'
import { ServiceWorkerRegister } from '@/components/pomme/sw-register'
import '@/app/globals.css'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })
const sacramento = Sacramento({ subsets: ['latin'], weight: '400', variable: '--font-sacramento', display: 'swap' })

export function RootShell({ lang, children }: { lang: 'en-US' | 'en-GB'; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${archivo.variable} ${sacramento.variable} bg-oxblood`}>
      <body className="font-sans antialiased">
        {children}
        <CookieBanner />
        <TrackingScripts />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
