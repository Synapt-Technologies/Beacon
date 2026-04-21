import { DeviceAlertAction } from "../../../src/tally/types/DeviceTypes"

export const UI_ALERT_PRESENTATION: Record<DeviceAlertAction, {color: string, name:  string}> = {
  [DeviceAlertAction.IDENT]:  {color: '#378ADD', name: "Identify"},
  [DeviceAlertAction.INFO]:   {color: '#BA7517', name: "Info"},
  [DeviceAlertAction.NORMAL]: {color: '#1D9E75', name: "Normal"},
  [DeviceAlertAction.PRIO]:   {color: '#E24B4A', name: "Priority"},
  [DeviceAlertAction.CLEAR]:  {color: '#888780', name: "Clear"},
} as const
