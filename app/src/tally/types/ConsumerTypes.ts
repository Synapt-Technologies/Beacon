import type { ConnectionState } from "./CommonTypes";

export type ConsumerId = string;


export interface ConsumerConfig {
    id: ConsumerId;
    name: string;
}

export interface ConsumerInfo {
    moment: number | null;
    status: ConnectionState;
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
