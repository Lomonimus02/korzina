import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Moonely — Создать сайт нейросетью'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #000000, #1a1a1a)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          {/* Moonely Logo Placeholder */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: '-0.05em',
            }}
          >
            Moonely
          </div>
        </div>
        <div
          style={{
            fontSize: 40,
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          Создай сайт за 60 секунд
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
