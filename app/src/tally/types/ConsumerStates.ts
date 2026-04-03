import { type GlobalTallySource } from "./ProducerStates";

export type ConsumerId = string;
export type DeviceId = string;

export enum DeviceAlertState { // TODO Check if these are desired types
    IDENT,
    INFO,
    NORMAL,
    PRIO,
}

export enum DeviceAlertTarget {
    OPERATOR,
    TALENT,
    ALL
}

export enum DeviceTallyState { // TODO maybe add an warning state that is yellow, in the future logic in the ui can dictate what state means what.
    NONE = 0,
    WARNING = 1,
    PREVIEW = 4,
    PROGRAM = 7
}

export interface DeviceAddress {
    consumer: ConsumerId;
    device: DeviceId;
}

export enum ConnectionType {
    INTERNAL,
    NETWORK,
    WIRELESS
}

export interface TallyDevice {
    id: DeviceAddress;
    name: {
        short: string;
        long: string;
    };
    connection: ConnectionType;
    patch: Array<GlobalTallySource>;
    // TODO ADD SOURCES LEADING TO TALLY
    state: DeviceTallyState;
}