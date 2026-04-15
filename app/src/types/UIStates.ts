import { type AlertSlotConfig, DEFAULT_ALERT_SLOTS } from "../tally/types/ConsumerStates"

export type UIAlertSlot = AlertSlotConfig

export interface UIConfig {
    alerts: UIAlertSlot[]
}

export const DEFAULT_UI_ALERT_CONFIG: UIAlertSlot[] = DEFAULT_ALERT_SLOTS
