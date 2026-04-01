import { GlobalTallySource, TallyState } from "./TallyState";

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

export enum DeviceTallyState {
    NONE = 0,
    PREVIEW = 1,
    PROGRAM = 2
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