import { type GlobalTallySource } from "./ProducerStates";

export type ConsumerId = string;
export type DeviceId = string;

// TODO: More of a DeviceAlertAction?
// TODO CHECK STRING VALUES
export enum DeviceAlertState { // TODO Check if these are desired types
    IDENT,
    INFO,
    NORMAL,
    PRIO,
    CLEAR
}

// TODO CHECK STRING VALUES
export enum DeviceAlertTarget {
    OPERATOR,
    TALENT,
    ALL
}

export enum DeviceTallyState { // TODO maybe add an warning state that is yellow, in the future logic in the ui can dictate what state means what.
    NONE = 0,
    DANGER = 2, // Light redish
    WARNING = 1, // Yellow
    PREVIEW = 4,
    PROGRAM = 7
}

/** Maps each DeviceTallyState enum key (as published on the MQTT wire) to the UI display string. */
export const DeviceTallyDisplayName: { readonly [K in keyof typeof DeviceTallyState]: string } = {
    NONE:    'none',
    WARNING: 'warning',
    DANGER:  'danger',
    PREVIEW: 'pvw',
    PROGRAM: 'pgm',
} as const

export interface DeviceAddress {
    consumer: ConsumerId;
    device: DeviceId;
}

export enum ConnectionType {
    HARDWARE,
    NETWORK,
    WIRELESS,
    VIRTUAL
}

export interface DeviceName {
    short?: string;
    long: string;
}

export interface AlertSlotConfig {
    action: DeviceAlertState;
    target: DeviceAlertTarget | null;
    timeout: number | null;
}

export const DEFAULT_ALERT_SLOTS: AlertSlotConfig[] = [
    { action: DeviceAlertState.IDENT,  target: DeviceAlertTarget.ALL,      timeout: 4000 },
    { action: DeviceAlertState.PRIO,   target: DeviceAlertTarget.OPERATOR, timeout: 1250 },
    { action: DeviceAlertState.NORMAL, target: DeviceAlertTarget.ALL,      timeout: 3000 },
    { action: DeviceAlertState.CLEAR,  target: null,                       timeout: null },
]

export interface TallyDevice {
    id: DeviceAddress;
    name: DeviceName;
    connection: ConnectionType;
    patch: Array<GlobalTallySource>;
    // TODO ADD SOURCES LEADING TO TALLY
    state: DeviceTallyState;
    last_update?: number;
}


export abstract class GlobalDeviceTools {
    static create (consumer: ConsumerId, device: DeviceId): string { // Todo: Maybe global addressing tools?
        return `${consumer}:${device}`;
    } 

    static parse (key: string): DeviceAddress {
        const [consumer, ...deviceParts] = key.split(":");
        return { consumer, device: deviceParts.join(":") };
    }
};