import type { SourceMap } from "./SourceTypes";
import type { ConnectionState, DisplayName } from "./CommonTypes";

export type ProducerId = string;

//? Producer Config (producer input)
export interface ProducerConfig {
    id: ProducerId,
    name: string;
}

//? Producer Info (producer output)
export interface ProducerState {
    state: ConnectionState;
    moment: number;
}

export interface ProducerInfo extends ProducerState {
    model: DisplayName;
    sources: SourceMap;
}


//? Producer Bundles
export interface ProducerBundle {
    type: string,
    enabled: boolean,
    config: ProducerConfig,
    info: ProducerInfo
}
