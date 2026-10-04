import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const alt = 'Pomme: Your week, beautifully sorted'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const apple = await readFile(join(process.cwd(), 'lib/assets/hero-apple-og.png'))
  const appleSrc = `data:image/png;base64,${apple.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: 'radial-gradient(60% 80% at 75% 50%, #5a1019 0%, #1c0709 70%)',
          color: '#fbf4ec',
          padding: '0 72px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: 640 }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#8cc152', letterSpacing: -1 }}>pomme</div>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 0.92, letterSpacing: -4, marginTop: 24 }}>
            your week, beautifully sorted.
          </div>
          <div style={{ fontSize: 30, marginTop: 32, color: 'rgba(251,244,236,0.75)', lineHeight: 1.3 }}>
            Dinners, groceries and budget, planned every Sunday.
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={appleSrc} width={500} height={500} alt="" style={{ marginLeft: 'auto' }} />
      </div>
    ),
    size,
  )
}
