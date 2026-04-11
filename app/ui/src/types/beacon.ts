// ─── Tally state ─────────────────────────────────────────────────────────────

export type TallyState = 'pgm' | 'pvw' | 'none'

/** Mirror of backend DeviceTallyState enum (ConsumerStates.ts) */
export const DeviceTallyStateValue = {
  NONE: 0,
  WARNING: 1,
  DANGER: 2,
  PREVIEW: 4,
  PROGRAM: 7,
} as const

export function stateFromValue(v: number): TallyState {
  if (v === DeviceTallyStateValue.PROGRAM || v === DeviceTallyStateValue.DANGER) return 'pgm'
  if (v === DeviceTallyStateValue.PREVIEW || v === DeviceTallyStateValue.WARNING) return 'pvw'
  return 'none'
}

// ─── Producers ───────────────────────────────────────────────────────────────

export interface GlobalTallySource {
  producer: string
  source: string
}

export interface SourceInfo {
  source: GlobalTallySource
  long: string
  short: string
}

export interface ProducerConfig {
  id: string
  name?: string
  host?: string
  port?: number
}

/** Returned by GET /api/producers.
 *  NOTE: Add an `info` field to AdminState when wiring up ProducerInfo. */
export interface ProducerEntry {
  type: string
  config: ProducerConfig
  /** Populated once GET /api/producers returns enriched info */
  info?: {
    model: string
    connected: boolean
    update_moment: number | null
    sources: Record<string, SourceInfo> // globalKey → SourceInfo
  }
}

// ─── Consumers ───────────────────────────────────────────────────────────────

export type ConsumerId = 'gpio' | 'aedes'

export interface ConsumerEntry {
  enabled?: boolean
  available?: boolean
  config?: Record<string, unknown>
}

export type ConsumersState = Partial<Record<ConsumerId, ConsumerEntry>>

// ─── Devices ─────────────────────────────────────────────────────────────────

/** Mirror of backend TallyDevice (ConsumerStates.ts) */
export interface TallyDevice {
  id: { consumer: string; device: string }
  name?: { short: string; long: string }
  connection: number  // ConnectionType enum value
  patch: GlobalTallySource[]
  state: number       // DeviceTallyState enum value
  last_update?: number
}

/** Flat shape used by the UI — computed from TallyDevice */
export interface UIDevice {
  key: string           // "consumer:device"
  long: string
  short: string
  consumerId: ConsumerId
  consumerName: string
  connectionLabel: string
  patch: GlobalTallySource[]
  state: TallyState
  lastUpdate: string
}

// ─── Alert buttons ───────────────────────────────────────────────────────────

/** Mirror of backend DeviceAlertState (ConsumerStates.ts) */
export type AlertAction = 'IDENT' | 'INFO' | 'NORMAL' | 'PRIO' | 'CLEAR'

/** Mirror of backend DeviceAlertTarget (ConsumerStates.ts) */
export type AlertTarget = 'ALL' | 'OPERATOR' | 'TALENT'

// export interface AlertSlot {
//   action: AlertAction
//   target: AlertTarget | null  // null for CLEAR
//   timeout: number | null      // seconds; 0 = hold until cleared; null for CLEAR
// }

// export const DEFAULT_ALERT_CONFIG: AlertSlot[] = [
//   { action: 'IDENT', target: 'ALL', timeout: 5 },
//   { action: 'PRIO',  target: 'OPERATOR', timeout: 0 },
//   { action: 'INFO',  target: 'ALL', timeout: 10 },
//   { action: 'CLEAR', target: null, timeout: null },
// ]

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

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  consumers: { gpio: boolean; aedes: boolean }
  network: { adminPort: number; mqttPort: number; keepAliveMs: number }
  behaviour: { stateOnDisconnect: 'None' | 'Preview' | 'Program' | 'Warning' }
  alertConfig: AlertSlot[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  consumers: { gpio: true, aedes: true },
  network: { adminPort: 3000, mqttPort: 1883, keepAliveMs: 500 },
  behaviour: { stateOnDisconnect: 'None' },
  alertConfig: DEFAULT_ALERT_CONFIG,
}