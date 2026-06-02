import type { ConnectionState, DisplayName } from "../common/common.domain";
import type { BusGroupInfoMap, SourceMap } from "../SourceTypes";
import type { BaseProducerConfig } from "./producers.schema";

export interface ProducerInfo {
  state: ConnectionState;
  model: DisplayName;
  sources: SourceMap;
  busses: BusGroupInfoMap;
}

export type InfoProducerBundle<
  TType extends string = string,
  TConfig extends BaseProducerConfig = BaseProducerConfig,
> = {
  type: TType;
  enabled: boolean;
  config: TConfig;
  info: ProducerInfo;
};
