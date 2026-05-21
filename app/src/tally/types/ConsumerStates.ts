import { type GlobalTallySource } from "./ProducerStates";

export type ConsumerId = string;
export type DeviceId = string;

// TODO: More of a DeviceAlertAction?
// TODO CHECK STRING VALUES
export enum DeviceAlertState { // TODO Check if these are desired types
    CLEAR = 0,
    IDENT = 2,
    INFO = 4,
    NORMAL = 6,
    PRIO = 8,
}

// TODO CHECK STRING VALUES
export enum DeviceAlertTarget {
    ALL = 0,
    OPERATOR = 1,
    TALENT = 2,
}

export enum DeviceTallyState {
    NONE = 0,
    DANGER = 4, // Light redish
    INFO = 8, // bLUE
    WARNING = 12, // Yellow
    PREVIEW = 16,
    PROGRAM = 20
}

/** Maps each DeviceTallyState enum key (as published on the MQTT wire) to the UI display string. */
export const DeviceTallyDisplayName: { readonly [K in keyof typeof DeviceTallyState]: string } = {
    NONE:    'none',
    INFO:    'info',
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
    brightness?: number; // 0-100
    flip?: boolean;
    connection: ConnectionType;
    patch: Array<GlobalTallySource>;
    // TODO ADD SOURCES LEADING TO TALLY
    state: DeviceTallyState;
    last_update?: number;
    model?: string;
}


export abstract class GlobalDeviceTools {
    // TODO Move / refactor?
    static defaultDevice(partial: Partial<TallyDevice> & Pick<TallyDevice, 'id' | 'name'>): TallyDevice {
        return {
            brightness: 100,
            flip: false,
            connection: ConnectionType.VIRTUAL,
            patch: [],
            state: DeviceTallyState.NONE,
            ...partial,
        }
    }

    static create (consumer: ConsumerId, device: DeviceId): string { // Todo: Maybe global addressing tools?
        return `${consumer}:${device}`;
    } 

    static parse (key: string): DeviceAddress {
        const [consumer, ...deviceParts] = key.split(":");
        return { consumer, device: deviceParts.join(":") };
    }
};