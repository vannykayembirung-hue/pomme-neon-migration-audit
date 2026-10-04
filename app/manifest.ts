import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pomme: Your week, beautifully sorted',
    short_name: 'Pomme',
    description: 'Your dinners, your grocery list and your budget, planned every Sunday.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#1c0709',
    theme_color: '#1c0709',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
