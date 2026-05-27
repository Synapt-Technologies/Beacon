import type { SourceMap } from "./SourceTypes";
import type { ConnectionState, DisplayName } from "./CommonTypes";

export type ProducerId = string;


export interface ProducerConfig {
    id: ProducerId,
    name?: string;
}

export interface ProducerInfo {
    moment: number | null;
    model: DisplayName;
    sources: SourceMap;
    status: ConnectionState;
}

export interface ProducerBundle {
    type: string,
    enabled: boolean,
    config: ProducerConfig,
    info: ProducerInfo
}
