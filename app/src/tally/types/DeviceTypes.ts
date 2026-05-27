import type { ConsumerId } from "./ConsumerTypes";
import { LogicFactory, type PatchNode } from "./LogicTypes";
import type { GlobalSource } from "./SourceTypes";

export type DeviceId = string;
export type DeviceKey = `${ConsumerId}:${DeviceId}`;


//? DEVICE Interfaces
export interface DeviceAddress {
    consumer: ConsumerId;
    device: DeviceId;
}

export enum ConnectionType {
    LOCAL       = 0,
    VIRTUAL     = 1,
    NETWORK     = 2,
    WIRELESS    = 3,
    MESH        = 4,
}

export interface DeviceName {
    long: string;
    short?: string;
}


// TODO: Brightness as float?
export interface BaseDeviceRuntimeConfig {
    name: DeviceName;
    brightness: number; // 0-100
    flip: boolean;
}

export interface DeviceInfo {
    connection?: ConnectionType;
    deviceName?: string; // TODO: Move to telemetry. | Name defined in the device, used to differentiate.
    model?: string;
    output_count?: number;
}

export interface BaseTallyDevice {
    id: DeviceAddress;
}

export interface MinimalTallyDevice extends BaseTallyDevice {
    info: DeviceInfo;
}

export interface TallyDevice extends MinimalTallyDevice {
    logic: PatchNode;
    runtime: BaseDeviceRuntimeConfig;
    telemetry?: null; // TODO: Combine telemetry and last seen. Last seen can also be set by discovery.
    last_seen: number;
}

// ? ALERTS
// TODO More types?
export enum DeviceAlertAction {
    CLEAR = 0,
    IDENT = 2,
    INFO = 4,
    NORMAL = 6,
    PRIO = 8,
}

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
    LIGHT = 14, // White
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


//? Device packages


export interface BaseDeviceBundle extends BaseTallyDevice {
    moment: number;
}

export interface DeviceStatePackage {
    state: DeviceTallyState;
    active_sources: GlobalSource[]; // TODO: Implement or remove.
}

export interface DeviceStateBundle extends DeviceStatePackage, BaseDeviceBundle {}

export interface DeviceAlertPackage {
    action: DeviceAlertAction;
    target: DeviceAlertTarget | null;
    timeout: number | null;
}

export interface DeviceAlertBundle extends DeviceAlertPackage, BaseDeviceBundle {}

export interface DeviceDiscoveryBundle extends MinimalTallyDevice {} // Empty for now, might add more in the future

//? Device tools and DTOs
const defaultTallyDevice = (): Omit<TallyDevice, "id"> => ({
    logic: LogicFactory.createSimpleBusNode(),
    runtime: {
        name: { long: "Unnamed Device" },
        brightness: 100,
        flip: false,
    },
    info: {},
    last_seen: Date.now(),
});

export class TallyDeviceDto implements TallyDevice {
    id: DeviceAddress;
    logic: PatchNode;
    runtime: BaseDeviceRuntimeConfig;
    info: DeviceInfo;
    telemetry?: null; 
    last_seen: number;

    constructor(device: Partial<TallyDevice> & Pick<TallyDevice, "id">) {
        const newDevice = { ...defaultTallyDevice(), ...device };
        this.id = newDevice.id;
        this.logic = newDevice.logic;
        this.runtime = newDevice.runtime;
        this.info = newDevice.info;
        this.telemetry = newDevice.telemetry;
        this.last_seen = newDevice.last_seen;
    }

    static fromDiscoveryBundle(bundle: DeviceDiscoveryBundle): TallyDevice {
        return new TallyDeviceDto(bundle);
    }

    toInterface(): TallyDevice {
        return this as TallyDevice;
    }

    toKey(): DeviceKey {
        return DeviceTools.create(this.id.consumer, this.id.device);
    }


    //? Bundles
    toStateBundle(pckg: DeviceStatePackage): DeviceStateBundle {
        return {
            ...this,
            ...pckg,
            moment: Date.now(),
        };
    }

    toAlertBundle(pckg: DeviceAlertPackage): DeviceAlertBundle {
        return {
            ...this,
            ...pckg,
            moment: Date.now(),
        };
    }


    //? Serialisation
    serialize(): string {
        return JSON.stringify(this.toInterface());
    }
    
}


export abstract class DeviceTools {

    static create (consumer: ConsumerId, device: DeviceId): DeviceKey { 
        return `${consumer}:${device}`;
    } 

    static parse (key: DeviceKey): DeviceAddress {
        const [consumer, ...deviceParts] = key.split(":");
        return { consumer, device: deviceParts.join(":") };
    }
};
