import { DeviceAlertState, DeviceAlertTarget } from "../tally/types/ConsumerStates"

export interface UIConfig {
    alerts: UIAlertSlot[]
}

export interface UIAlertSlot {
  action: DeviceAlertState
  target: DeviceAlertTarget | null  // null for CLEAR
  timeout: number | null 
}

export const DEFAULT_UI_ALERT_CONFIG: UIAlertSlot[] = [
  { action: DeviceAlertState.IDENT, target: DeviceAlertTarget.ALL, timeout: 5 },
  { action: DeviceAlertState.PRIO,  target: DeviceAlertTarget.OPERATOR, timeout: 0 },
  { action: DeviceAlertState.INFO,  target: DeviceAlertTarget.ALL, timeout: 10 },
  { action: DeviceAlertState.CLEAR, target: null, timeout: null },
] as const