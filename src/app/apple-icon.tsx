import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius: '32px',
        }}
      >
        <div style={{
          position: 'relative',
          width: '140px',
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #BA5D4F 0%, #FFE5DB 100%)',
            top: '10px',
            left: '30px',
          }} />
          <div style={{
            position: 'absolute',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #742218 0%, #BA5D4F 100%)',
            bottom: '10px',
            left: '10px',
          }} />
          <div style={{
            position: 'absolute',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #BA5D4F 0%, #FFE5DB 100%)',
            bottom: '20px',
            right: '10px',
          }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
