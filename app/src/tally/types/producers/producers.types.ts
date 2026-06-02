import type { ProducerId } from "../common/common.schema";
import type { ConnectionState, DisplayName } from "../common/common.domain";
import type { BusGroupInfoMap, SourceMap } from "../SourceTypes";

export interface BaseProducerConfig {
  id: ProducerId;
  name: string;
}

export interface NetClientProducerConfig extends BaseProducerConfig {
  host: string;
  port: number;
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

export interface ProducerInfo {
  state: ConnectionState;
  model: DisplayName;
  sources: SourceMap;
  busses: BusGroupInfoMap;
}

export type InfoProducerBundle<
  TType extends string = string,
  TConfig extends BaseProducerConfig = BaseProducerConfig,
> = StoreProducerBundle<TType, TConfig> & { info: ProducerInfo };
