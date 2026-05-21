import type { ConsumerId } from "./ConsumerTypes";
import type { GlobalSource } from "./SourceTypes";

export type DeviceId = string;

export interface DeviceAddress {
    consumer: ConsumerId;
    device: DeviceId;
}

export type DeviceKey = `${ConsumerId}:${DeviceId}`;

export enum ConnectionType {
    HARDWARE = 0,
    VIRTUAL = 1,
    NETWORK = 2,
    WIRELESS = 3,
    BEACON_MESH = 4,
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

// TODO: Add a way to differentiate between device capabilities. Probably inheritance.
// TODO: split config and state. Makes capabilities easier too.
// TODO: State on disconnect override?
export interface TallyDevice {
    id: DeviceAddress;
    name: DeviceName;
    brightness?: number; // 0-100
    flip?: boolean;
    connection: ConnectionType;
    patch: Array<GlobalSource>;
    // TODO ADD SOURCES LEADING TO TALLY
    state: DeviceTallyState;
    last_update?: number;
    model?: string;
}

export interface DeviceRuntimeConfig {
    brightness: number;
    flip: boolean;
    name: DeviceName;
}

export interface DeviceInfo {
    connection?: ConnectionType;
    name?: string; // Name defined in the device, used to differentiate.
    model?: string;
    output_count?: number;
}

interface DeviceDiscoveryPacket extends DeviceInfo {
    id: DeviceId;
}

interface NewTallyDevice { // TODO
    id: DeviceAddress;
    state: { // Tally logic, on base device topic.
        patch: Array<GlobalSource>;
        state: DeviceTallyState;
        last_update?: number;
    }
    runtime: DeviceRuntimeConfig;
    info: DeviceInfo
}

export abstract class GlobalDeviceTools { // Todo: Maybe a device DTO?
    // TODO Move / refactor?
    static defaultDevice(partial: Partial<TallyDevice> & Pick<TallyDevice, 'id' | 'name'>): TallyDevice {

        return {
            brightness: 100,
            flip: false,
            connection: ConnectionType.VIRTUAL,
            patch: [],
            state: DeviceTallyState.NONE,
            ...partial,
            name: {
                short: partial.name.short ?? partial.name.long,
                long: partial.name.long,
            },
        }
    }

    static create (consumer: ConsumerId, device: DeviceId): DeviceKey { 
        return `${consumer}:${device}`;
    } 

    static parse (key: DeviceKey): DeviceAddress {
        const [consumer, ...deviceParts] = key.split(":");
        return { consumer, device: deviceParts.join(":") };
    }
};
