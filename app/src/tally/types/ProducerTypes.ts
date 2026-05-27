import type { SourceMap } from "./SourceTypes";
import type { ConnectionState } from "./StatusTypes";

export type ProducerId = string;


export interface ProducerModel {
    long: string;
    short?: string;
}

export interface ProducerConfig {
    id: ProducerId,
    name?: string;
}

export interface ProducerInfo {
    moment: number | null;
    model: ProducerModel;
    sources: SourceMap;
    status: ConnectionState;
}

export interface ProducerBundle {
    type: string,
    enabled: boolean,
    config: ProducerConfig,
    info: ProducerInfo
}
