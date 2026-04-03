import { type GlobalTallySource } from "./TallyState";

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
    PREVIEW = 2,
    PROGRAM = 3
}

export interface DeviceAddress {
    parent: string;
    device: string;
}

export enum ConnectionType {
    INTERNAL,
    NETWORK,
    WIRELESS
}

export interface TallyDevice {
    id: DeviceAddress;
    name: string;
    connection: ConnectionType;
    patch: Array<GlobalTallySource>;
    
    state: DeviceTallyState;
}