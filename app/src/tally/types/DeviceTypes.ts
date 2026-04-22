import type { ConsumerId } from "./ConsumerTypes";
import type { GlobalSource, SourceBus } from "./SourceTypes";

export type DeviceId = string;

export interface DeviceAddress {
    consumer: ConsumerId;
    device: DeviceId;
}

export type DeviceKey = `${ConsumerId}:${DeviceId}`;
// export type DeviceKey = string;

export enum ConnectionType {
    LOCAL,
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

export enum DeviceTallyState {
    NONE = 0,
    DANGER = 2, // Light redish
    WARNING = 1, // Yellow
    PREVIEW = 4,
    PROGRAM = 7
}

export const DeviceTallyDisplayName: { readonly [K in keyof typeof DeviceTallyState]: string } = {
    NONE:    'none',
    WARNING: 'warning',
    DANGER:  'danger',
    PREVIEW: 'pvw',
    PROGRAM: 'pgm',
} as const

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

export interface DeviceTallyBundle {
    id: DeviceAddress;
    state: DeviceTallyState;
    moment?: number;
    sources?: SourceBus; // TODO ADD (/Imp) SOURCES LEADING TO TALLY
}

export interface DeviceAlertBundle {
    id: DeviceAddress;
    action: DeviceAlertAction;
    target: DeviceAlertTarget | null;
    timeout: number | null;
    moment?: number | null;
}

export interface TallyDevice {
    id: DeviceAddress;
    name: DeviceName;
    connection: ConnectionType;
    patch: Array<GlobalSource>; // TODO: Implement more complex patching logic
}

export class DeviceAddressDto implements DeviceAddress {
    consumer: ConsumerId;
    device: DeviceId;

    constructor(consumer: ConsumerId, device: DeviceId) {
        this.consumer = consumer;
        this.device = device;
    }

    static from(address: DeviceAddress | DeviceKey | DeviceAddressDto): DeviceAddressDto {
        if (address instanceof DeviceAddressDto){
            return address;
        }
        if (typeof address === "string") {
            return this.fromKey(address);
        }
        
        return new DeviceAddressDto(address.consumer, address.device);
    }

    static fromKey(key: DeviceKey): DeviceAddressDto {
        const [consumer, ...deviceParts] = key.split(":");
        return new DeviceAddressDto(consumer, deviceParts.join(":"));
    }

    toKey(): DeviceKey {
        return `${this.consumer}:${this.device}` as DeviceKey;
    }

    toString(): string {
        return this.toKey();
    }

    toJSON(): DeviceAddress {
        return {
            consumer: this.consumer,
            device: this.device,
        };
    }
}
