import type { ConnectionState } from "../zod.common/common.domain";
import type { DisplayName } from "../zod.common/common.schema";
import type { BusGroupInfoMap, SourceMap } from "../SourceTypes";
import type { BaseProducerConfig } from "./producers.base.schema";

/**
 * Live state emitted by a producer. Never validated — constructed internally at runtime.
 * @see InfoProducerBundle
 */
export interface ProducerInfo {
  state: ConnectionState;
  model: DisplayName;
  sources: SourceMap;
  busses: BusGroupInfoMap;
}

/**
 * Full runtime bundle combining stored config with live producer state.
 * Extends the shape of {@link StoreProducerBundle} with a {@link ProducerInfo} field.
 * Read-only — sent from server to UI, never validated as input.
 */
export type InfoProducerBundle<
  TType extends string = string,
  TConfig extends BaseProducerConfig = BaseProducerConfig,
> = {
  type: TType;
  enabled: boolean;
  config: TConfig;
  info: ProducerInfo;
};
