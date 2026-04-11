import { DeviceAlertState } from "../../../src/tally/types/ConsumerStates"

export const UI_ALERT_PRESENTATION: Record<DeviceAlertState, {color: string, name:  string}> = {
  [DeviceAlertState.IDENT]:  {color: '#378ADD', name: "Identify"},
  [DeviceAlertState.INFO]:   {color: '#BA7517', name: "Info"},
  [DeviceAlertState.NORMAL]: {color: '#1D9E75', name: "Normal"},
  [DeviceAlertState.PRIO]:   {color: '#E24B4A', name: "Priority"},
  [DeviceAlertState.CLEAR]:  {color: '#888780', name: "Clear"},
} as const
