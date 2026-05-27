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


//? Info about the device (and its capabilities). Doesn't change a lot.
export interface DeviceInfo {
    label?: string; // Name defined in the device, used to differentiate.
    model?: string;
    firmware?: {
        type: string;      // Support for non beacon-device firmware. e.g. app?
        version: string;   // version as string. Preference for semantic.
    };
    connection: ConnectionType;
    output_count?: number;
}

//? Info about the device's situation. Is updated on the ping the device sends.
export interface DeviceTelemetry {
    last_seen: number;
    uptime?: number;
    rssi?: number;
    ip?: string;
    error?: string | null; // TODO: Different type, maybe a fixed error type/interface the devices adhere to?
}

export interface BaseTallyDevice {
    id: DeviceAddress;
}

export interface MinimalTallyDevice extends BaseTallyDevice {
    info: DeviceInfo;
}

export interface StoredTallyDevice extends MinimalTallyDevice {
    logic: PatchNode;
    runtime: BaseDeviceRuntimeConfig;
};

export interface TallyDevice extends StoredTallyDevice {
    telemetry?: DeviceTelemetry;
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

export interface DeviceAlertPackage {
    action: DeviceAlertAction;
    target: DeviceAlertTarget | null;
    timeout: number | null;
}

export interface AlertSlotConfig {
    alert: DeviceAlertPackage;
}

export const DEFAULT_ALERT_SLOTS: AlertSlotConfig[] = [
    { alert: { action: DeviceAlertAction.IDENT,  target: DeviceAlertTarget.ALL,      timeout: 4000 } },
    { alert: { action: DeviceAlertAction.PRIO,   target: DeviceAlertTarget.OPERATOR, timeout: 1250 } },
    { alert: { action: DeviceAlertAction.NORMAL, target: DeviceAlertTarget.ALL,      timeout: 3000 } },
    { alert: { action: DeviceAlertAction.CLEAR,  target: null,                       timeout: null } },
]


//? Device packages


export interface BaseDeviceBundle extends BaseTallyDevice {
    moment: number;
}

export interface DeviceStatePackage {
    state: DeviceTallyState;
    active_sources: GlobalSource[]; // TODO: Implement or remove.
}

export interface DeviceStateBundle extends DeviceStatePackage, BaseDeviceBundle {/* empty */}

export interface DeviceAlertBundle extends DeviceAlertPackage, BaseDeviceBundle {/* empty */}

export interface DeviceDiscoveryBundle {
    id: DeviceId;
    info: DeviceInfo;
}

//? Device tools and DTOs
const defaultTallyDevice = (): Omit<TallyDevice, "id"> => ({
    info: {
        connection: ConnectionType.VIRTUAL,
    },
    logic: LogicFactory.createSimpleBusNode(),
    runtime: {
        name: { long: "Unnamed Device" },
        brightness: 100,
        flip: false,
    },
});

export class TallyDeviceDto implements TallyDevice {
    id: DeviceAddress;
    info: DeviceInfo;
    logic: PatchNode;
    runtime: BaseDeviceRuntimeConfig;
    telemetry?: DeviceTelemetry; 

    constructor(device: Partial<TallyDevice> & Pick<TallyDevice, "id">) {
        const newDevice = { ...defaultTallyDevice(), ...device };
        this.id = newDevice.id;
        this.info = newDevice.info;
        this.logic = newDevice.logic;
        this.runtime = newDevice.runtime;
        this.telemetry = newDevice.telemetry;
    }

    static fromDiscoveryBundle(bundle: DeviceDiscoveryBundle, consumer: ConsumerId): TallyDevice {
        return new TallyDeviceDto({ 
            ...bundle, 
            id: { 
                consumer, 
                device: bundle.id 
            } 
        });
    }

    toKey(): DeviceKey {
        return DeviceTools.create(this.id.consumer, this.id.device);
    }


    toBaseBundle(): BaseDeviceBundle {
        return {
            id: this.id,
            moment: Date.now(),
        }
    }

    //? Bundles
    toStateBundle(pckg: DeviceStatePackage): DeviceStateBundle {

        const output: DeviceStateBundle = {
            ...pckg,
            ...this.toBaseBundle(),
        };
        return output;
    }

    toAlertBundle(pckg: DeviceAlertPackage): DeviceAlertBundle {
        return {
            ...pckg,
            ...this.toBaseBundle(),
        };
    }


    //? Sub Interfaces
    toStored(): StoredTallyDevice {
        const sDev: StoredTallyDevice = {
            id: this.id,
            info: this.info,
            logic: this.logic,
            runtime: this.runtime,
        };
        return sDev;
    }


    //? Serialisation
    serialize(): string {
        return JSON.stringify(this);
    }

    serialiseForStorage(): string {
        return JSON.stringify(this.toStored());
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
