import type { ConnectionState, DisplayName } from "../common/common.domain";
import type { BaseProducerConfig } from "./producers.base.schema";

export interface ProducerState {
  state: ConnectionState;
}

// TODO: Split Info and State?
export interface ProducerInfo extends ProducerState {
  model: DisplayName;
  sources: SourceMap;
  busses: BusGroupInfoMap;
}

export interface ConfigProducerBundle<TConfig extends BaseProducerConfig = BaseProducerConfig> {
  enabled: boolean;
  config: TConfig;
}

export interface StoreProducerBundle<
  TType extends string = string,
  TConfig extends BaseProducerConfig = BaseProducerConfig,
> extends ConfigProducerBundle<TConfig> {
  type: TType;
}

export type InfoProducerBundle<
  TType extends string = string,
  TConfig extends BaseProducerConfig = BaseProducerConfig,
> = StoreProducerBundle<TType, TConfig> & { info: ProducerInfo };
