import type { ConnectionState, DisplayName } from "../common/common.domain";
import type { BaseProducerConfig } from "./producers.base.schema";


// TODO: Add moment if needed.
export interface ProducerInfo {
  state: ConnectionState;
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
