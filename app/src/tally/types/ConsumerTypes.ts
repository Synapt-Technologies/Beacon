import type { ConnectionState } from "./CommonTypes";

export type ConsumerId = string;

// TODO: Add some sort of Platform details? To publish on keepalive and set firmware version on RpiGpio devices etc.
export interface ConsumerConfig {
  id: ConsumerId;
  name: string;
}

// TODO: Add moment if needed, or make ConsumerInfoBundle with it.
export interface ConsumerInfo {
  state: ConnectionState;
  device_count: number;
}

export interface ConsumerBundle {
  type: string;
  enabled: boolean;
  available: boolean;
  disableable: boolean;
  config: ConsumerConfig;
  info: ConsumerInfo;
}
