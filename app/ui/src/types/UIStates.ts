import { DeviceAlertState, DeviceAlertTarget } from "../../../src/tally/types/ConsumerStates"

export interface UIAlertSlot {
  action: DeviceAlertState
  target: DeviceAlertTarget | null  // null for CLEAR
  timeout: number | null 
}

export const UI_ALERT_PRESENTATION: Record<DeviceAlertState, {color: string, name:  string}> = {
  [DeviceAlertState.IDENT]:  {color: '#378ADD', name: "Identify"},
  [DeviceAlertState.INFO]:   {color: '#BA7517', name: "Info"},
  [DeviceAlertState.NORMAL]: {color: '#1D9E75', name: "Normal"},
  [DeviceAlertState.PRIO]:   {color: '#E24B4A', name: "Priority"},
  [DeviceAlertState.CLEAR]:  {color: '#888780', name: "Clear"},
} as const

export const DEFAULT_UI_ALERT_CONFIG: UIAlertSlot[] = [
  { action: DeviceAlertState.IDENT, target: DeviceAlertTarget.ALL, timeout: 5 },
  { action: DeviceAlertState.PRIO,  target: DeviceAlertTarget.OPERATOR, timeout: 0 },
  { action: DeviceAlertState.INFO,  target: DeviceAlertTarget.ALL, timeout: 10 },
  { action: DeviceAlertState.CLEAR, target: null, timeout: null },
] as const