import type { ConsumerId } from '../types/beacon'

/** Single source of truth for consumer ID → display metadata. */
export const CONSUMER_META: Record<ConsumerId, { label: string; name: string }> = {
  gpio:  { label: 'GPIO hardware', name: 'GPIO hardware' },
  aedes: { label: 'MQTT broker',   name: 'MQTT broker'   },
}

/** Ordered list for rendering consumer sections. */
export const CONSUMER_SECTIONS = Object.entries(CONSUMER_META).map(
  ([id, { label }]) => ({ id: id as ConsumerId, label })
)
