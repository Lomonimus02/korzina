import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          borderRadius: '6px',
        }}
      >
        {/* Simplified logo representation using circles */}
        <div style={{
          position: 'relative',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #BA5D4F 0%, #FFE5DB 100%)',
            top: '2px',
            left: '6px',
          }} />
          <div style={{
            position: 'absolute',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #742218 0%, #BA5D4F 100%)',
            bottom: '2px',
            left: '2px',
          }} />
          <div style={{
            position: 'absolute',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #BA5D4F 0%, #FFE5DB 100%)',
            bottom: '4px',
            right: '2px',
          }} />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
