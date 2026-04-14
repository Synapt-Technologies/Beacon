import type { DeviceDisplayState } from '../types/beacon'

interface FullscreenOverlayProps {
  open: boolean
  state: DeviceDisplayState
  name: string
  sub: string
  onClose: () => void
}

export function FullscreenOverlay({ open, state, name, sub, onClose }: FullscreenOverlayProps) {
  if (!open) return null

  const bg =
    state === 'pgm'     ? 'var(--pgm)'     :
    state === 'pvw'     ? 'var(--pvw)'     :
    state === 'danger'  ? 'var(--danger)'  :
    state === 'warning' ? 'var(--warning)' :
    '#111'

  const color =
    state === 'none' ? '#555' : '#fff'

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
        background: bg, color, transition: 'background .25s',
      }}>
        <span style={{ fontSize: 36, fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 16, opacity: .75, fontWeight: 400 }}>{sub}</span>
      </div>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(0,0,0,.28)', border: 'none',
          color: 'rgba(255,255,255,.8)', borderRadius: 6,
          padding: '5px 12px', fontSize: 12, cursor: 'pointer',
        }}
      >
        ✕ Exit
      </button>
    </div>
  )
}