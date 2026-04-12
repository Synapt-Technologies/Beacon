import type { TallyState } from '../types/beacon'

interface TallyBlockProps {
  name: string
  sub?: string
  state: TallyState
  height?: number
  nameFontSize?: number
}

export function TallyBlock({ name, sub, state, height = 110, nameFontSize = 22 }: TallyBlockProps) {
  return (
    <div
      className={`blk-${state}`}
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 16,
        transition: 'background .25s',
      }}
    >
      <span style={{ fontSize: nameFontSize, fontWeight: 500 }}>{name}</span>
      {sub && <span style={{ fontSize: 13, opacity: .75, fontWeight: 400 }}>{sub}</span>}
    </div>
  )
}

const STATE_SUB: Record<TallyState, string> = {
  pgm:  'Program — on air',
  pvw:  'Preview — standing by',
  none: 'Idle — not active',
}

export function stateSub(state: TallyState) {
  return STATE_SUB[state]
}