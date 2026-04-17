import { useRef } from 'react'
import type { AlertSlot } from '../types/beacon'
import { ALERT_COLORS, ALERT_SHORT } from '../types/beacon'

const ALERT_ICONS: Record<string, React.ReactNode> = {
  IDENT: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="7" cy="7" r="2" fill="currentColor"/>
    </svg>
  ),
  INFO: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="7" y1="6" x2="7" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="7" cy="4.5" r=".8" fill="currentColor"/>
    </svg>
  ),
  NORMAL: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5L5.5 10.5L11.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  PRIO: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2L8.8 5.8H12.5L9.5 8.2L10.5 12L7 9.8L3.5 12L4.5 8.2L1.5 5.8H5.2z"
            stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  CLEAR: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 2"/>
      <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
}

interface AlertButtonsProps {
  slots: AlertSlot[]
  onAlert: (action: string, target: string | null, time: number) => void
}

interface AlertBtnProps {
  slot: AlertSlot
  onAlert: (action: string, target: string | null, time: number) => void
}

function AlertBtn({ slot, onAlert }: AlertBtnProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const lblRef = useRef<HTMLSpanElement>(null)

  const fire = () => {
    const btn = btnRef.current
    const lbl = lblRef.current
    if (!btn || !lbl) return

    // Ripple
    const ripple = document.createElement('span')
    ripple.className = 'ripple-el'
    ripple.style.left = '50%'
    ripple.style.top  = '50%'
    ripple.style.background = ALERT_COLORS[slot.action] ?? '#888'
    btn.appendChild(ripple)
    btn.style.animation = 'btn-fire .32s ease'

    const orig = lbl.style.color ?? ''
    lbl.style.color  = slot.action === 'CLEAR' ? '#1D9E75' : '#E85D30'

    setTimeout(() => ripple.remove(), 650)
    setTimeout(() => {
      btn.style.animation = ''
      lbl.style.color  = orig
    }, 750)

    onAlert(slot.action, slot.target, (slot.timeout ?? 1500))
  }

  const col = ALERT_COLORS[slot.action] ?? '#888'
  const sub = slot.action === 'CLEAR'
    ? 'Cancel alert'
    : `${slot.target ?? 'All'}${slot.timeout && slot.timeout > 0 ? ` · ${slot.timeout}s` : ''}`

  return (
    <button
      ref={btnRef}
      onClick={fire}
      style={{
        position: 'relative', overflow: 'hidden', flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '10px 6px', borderRadius: 'var(--border-radius-md)',
        border: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
        cursor: 'pointer', transition: 'border-color .15s, background .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-border-secondary)'
        e.currentTarget.style.background  = 'var(--color-background-primary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'
        e.currentTarget.style.background  = 'var(--color-background-secondary)'
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${col}1e`, color: col,
      }}>
        {ALERT_ICONS[slot.action]}
      </div>
      <span ref={lblRef} style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)', transition: 'color .2s' }}>
        {ALERT_SHORT[slot.action]}
      </span>
      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
        {sub}
      </span>
    </button>
  )
}

export function AlertButtons({ slots, onAlert }: AlertButtonsProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {slots.map((slot, i) => (
        <AlertBtn key={i} slot={slot} onAlert={onAlert} />
      ))}
    </div>
  )
}