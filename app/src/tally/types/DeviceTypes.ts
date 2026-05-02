import type { ConsumerId } from "./ConsumerTypes";
import type { GlobalSource } from "./SourceTypes";

export type DeviceId = string;

export interface DeviceAddress {
    consumer: ConsumerId;
    device: DeviceId;
}

export type DeviceKey = `${ConsumerId}:${DeviceId}`;

export enum ConnectionType {
    HARDWARE,
    NETWORK,
    WIRELESS,
    VIRTUAL
}

export interface DeviceName {
    long: string;
    short?: string;
}

// TODO: More of a DeviceAlertAction?
// TODO CHECK STRING VALUES
export enum DeviceAlertAction { // TODO Check if these are desired types
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

export interface AlertSlotConfig {
    action: DeviceAlertAction;
    target: DeviceAlertTarget | null;
    timeout: number | null;
}

export const DEFAULT_ALERT_SLOTS: AlertSlotConfig[] = [
    { action: DeviceAlertAction.IDENT,  target: DeviceAlertTarget.ALL,      timeout: 4000 },
    { action: DeviceAlertAction.PRIO,   target: DeviceAlertTarget.OPERATOR, timeout: 1250 },
    { action: DeviceAlertAction.NORMAL, target: DeviceAlertTarget.ALL,      timeout: 3000 },
    { action: DeviceAlertAction.CLEAR,  target: null,                       timeout: null },
]

export interface TallyDevice {
    id: DeviceAddress;
    name: DeviceName;
    connection: ConnectionType;
    patch: Array<GlobalSource>;
    // TODO ADD SOURCES LEADING TO TALLY
    state: DeviceTallyState;
    last_update?: number;
}

export abstract class GlobalDeviceTools { // Todo: Maybe a device DTO?
    static create (consumer: ConsumerId, device: DeviceId): DeviceKey { 
        return `${consumer}:${device}`;
    } 

    static parse (key: DeviceKey): DeviceAddress {
        const [consumer, ...deviceParts] = key.split(":");
        return { consumer, device: deviceParts.join(":") };
    }
};
