import { DeviceTallyState, DeviceTallyDisplayName } from '../../../src/tally/types/DeviceTypes'

// ─── Tally state ─────────────────────────────────────────────────────────────

/** Live MQTT source state — only what tally/global can carry */
export type TallyState = 'pgm' | 'pvw' | 'none'

/** Full device display state — includes alert/disconnect states */
export type DeviceDisplayState = TallyState | 'danger' | 'warning'

/** Maps a numeric DeviceTallyState value (from REST or orchestratorConfig) to a display string. */
export function stateFromValue(v: number): DeviceDisplayState {
  const key = DeviceTallyState[v] as keyof typeof DeviceTallyState | undefined
  return ((key && DeviceTallyDisplayName[key]) ?? 'none') as DeviceDisplayState
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
  timeout: number | null      // seconds; 0 = hold until cleared; null for CLEAR
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
