import type { BusGroupInfoMap, SourceMap } from "./SourceTypes";
import type { ConnectionState, DisplayName } from "./CommonTypes";

export type ProducerId = string;

//? Producer Config (producer input)
export interface ProducerConfig {
  id: ProducerId;
  name: string;
}

//? Producer Info (producer output)
// TODO: Add moment if needed, or make ProducerStateBundle (and ProducerInfoBundle) with it.
export interface ProducerState {
  state: ConnectionState;
}

// TODO: Split Info and State?
export interface ProducerInfo extends ProducerState {
  model: DisplayName;
  sources: SourceMap;
  busses: BusGroupInfoMap;
}

//? Producer Bundles

export interface ConfigProducerBundle {
  enabled: boolean;
  config: ProducerConfig;
}

export interface StoreProducerBundle extends ConfigProducerBundle {
  type: string;
}

export interface ProducerBundle extends StoreProducerBundle {
  info: ProducerInfo;
}
