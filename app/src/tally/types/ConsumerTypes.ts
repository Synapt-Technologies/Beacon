import type { ConnectionState } from "./CommonTypes";

export type ConsumerId = string;


export interface ConsumerConfig {
    id: ConsumerId;
    name: string;
}

export interface ConsumerInfo {
    state: ConnectionState;
    moment: number;
    device_count: number;
}

export interface ConsumerBundle {
    type: string,
    enabled: boolean,
    available: boolean,
    disableable: boolean,
    config: ConsumerConfig,
    info: ConsumerInfo
}
