'use client'

import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { useSyncExternalStore } from 'react'
import { consentSnapshot, hasConsent, subscribeConsent } from '@/lib/consent'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const TIKTOK_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID

/** Renders nothing until the visitor has opted in. Reject-all injects no third-party script. */
export function TrackingScripts() {
  const raw = useSyncExternalStore(subscribeConsent, consentSnapshot, () => '')
  if (!raw) return null
  const analytics = hasConsent('analytics')
  const marketing = hasConsent('marketing')

  return (
    <>
      {analytics && process.env.NODE_ENV === 'production' && <Analytics />}
      {analytics && GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: '${marketing ? 'granted' : 'denied'}', ad_user_data: '${marketing ? 'granted' : 'denied'}', ad_personalization: '${marketing ? 'granted' : 'denied'}' });
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { anonymize_ip: true });
          `}</Script>
        </>
      )}
      {marketing && META_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_ID}'); fbq('track', 'PageView');
        `}</Script>
      )}
      {marketing && TIKTOK_ID && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`
          !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=n+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${TIKTOK_ID}');ttq.page()}(window,document,'ttq');
        `}</Script>
      )}
    </>
  )
}
