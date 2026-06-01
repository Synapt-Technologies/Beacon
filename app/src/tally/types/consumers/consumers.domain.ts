import type { ConnectionState } from "../CommonTypes";
import type { BaseConsumerConfig } from "./consumers.schema";


// TODO: Add moment if needed.
export interface ConsumerInfo {
  state: ConnectionState;
  device_count: number;
}

export interface ConfigConsumerBundle<TConfig extends BaseConsumerConfig = BaseConsumerConfig> {
  enabled: boolean;
  config: TConfig;
}

export interface StoreConsumerBundle<
  TType extends string = string,
  TConfig extends BaseConsumerConfig = BaseConsumerConfig,
> extends ConfigConsumerBundle<TConfig> {
  type: TType;
}

export type InfoConsumerBundle<
  TType extends string = string,
  TConfig extends BaseConsumerConfig = BaseConsumerConfig,
> = StoreConsumerBundle<TType, TConfig> & { info: ConsumerInfo };
