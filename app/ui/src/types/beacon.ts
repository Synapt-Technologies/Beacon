import { DeviceTallyState } from '../../../src/tally/types/DeviceTypes'

// ─── Tally state ─────────────────────────────────────────────────────────────

/** All possible tally display states — derived from the backend DeviceTallyState enum. */
export type TallyState = Lowercase<keyof typeof DeviceTallyState>
// = 'none' | 'danger' | 'info' | 'warning' | 'light' | 'preview' | 'program'

/** @deprecated Use TallyState directly. */
export type DeviceDisplayState = TallyState

/** CSS value for each TallyState — single source of truth for inline tally colouring. */
export const TALLY_COLOR: Record<TallyState, string> = {
  program: 'var(--program)',
  preview: 'var(--preview)',
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--info)',
  light:   'var(--light)',
  none:    'var(--color-border-tertiary)',
}

/** Maps a numeric DeviceTallyState value (from REST or orchestratorConfig) to a TallyState string. */
export function stateFromValue(v: number): TallyState {
  return (DeviceTallyState[v]?.toLowerCase() ?? 'none') as TallyState
}

// ─── Consumers ───────────────────────────────────────────────────────────────

export type ConsumerId = 'gpio' | 'aedes'

// ─── Alert buttons ───────────────────────────────────────────────────────────

/** Mirror of backend DeviceAlertState (ConsumerStates.ts) */
export type AlertAction = 'IDENT' | 'INFO' | 'NORMAL' | 'PRIO' | 'CLEAR'

/** Mirror of backend DeviceAlertTarget (ConsumerStates.ts) */
export type AlertTarget = 'ALL' | 'OPERATOR' | 'TALENT'

export interface AlertSlot {
  action: AlertAction
  target: AlertTarget | null  // null for CLEAR
  timeout: number | null      // milliseconds; 0 = hold until cleared; null for CLEAR
}

export const ALERT_COLORS: Record<AlertAction, string> = {
  IDENT:  '#378ADD',
  INFO:   '#BA7517',
  NORMAL: '#1D9E75',
  PRIO:   '#E24B4A',
  CLEAR:  '#888780',
}

export const ALERT_SHORT: Record<AlertAction, string> = {
  IDENT:  'Identify',
  INFO:   'Info',
  NORMAL: 'Normal',
  PRIO:   'Priority',
  CLEAR:  'Clear',
}

export const ALERT_LONG: Record<AlertAction, string> = {
  IDENT:  'Identify (IDENT)',
  INFO:   'Info (INFO)',
  NORMAL: 'Normal (NORMAL)',
  PRIO:   'Priority (PRIO)',
  CLEAR:  'Clear alert',
}
