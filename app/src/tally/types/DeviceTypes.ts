import { TallyState, type DisplayName } from "./CommonTypes";
import type { ConsumerId } from "./ConsumerTypes";
import { LogicFactory, type PatchNode } from "./LogicTypes";
import type { SourceMap } from "./SourceTypes";

export type DeviceId = string;
export type DeviceKey = `${ConsumerId}:${DeviceId}`;

//? DEVICE Interfaces
export interface DeviceAddress {
  consumer: ConsumerId;
  device: DeviceId;
}

export enum ConnectionType {
  LOCAL = 0,
  VIRTUAL = 1,
  NETWORK = 2,
  WIRELESS = 3,
  MESH = 4,
}

// TODO: Brightness as float?
// TODO: Add support for device specific settings?
export interface DeviceRuntimeConfig {
  name: DisplayName;
  brightness: number; // 0-100
  flip: boolean;
}
//? Device config globally applied. Not stored in a device, but it is sent in a package/bundle.
export interface GlobalDeviceRuntimeConfig {
  state_on_disconnect: TallyState;
}


//? Info about the device (and its capabilities). Doesn't change a lot.
export interface DeviceInfo {
  label?: string; // Name defined in the device, used to differentiate.
  model?: string; // Todo: DisplayName with long and short?
  firmware?: {
    type: string; // Support for non beacon-device firmware. e.g. app?
    version?: string; // version as string. Preference for semantic.
  }; // TODO: add bigger text field with device details?
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
  runtime: DeviceRuntimeConfig;
}

// ! Warning: All fields except logic and runtime are overridden when a device with the same id is added. Telemetry is only overridden if set on the new device.
export interface TallyDevice extends StoredTallyDevice {
  telemetry?: DeviceTelemetry;
}

export type TallyDeviceMap = Map<DeviceKey, TallyDevice>;
export type TallyDeviceDtoMap = Map<DeviceKey, TallyDeviceDto>;

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

export interface DeviceAlertData {
  action: DeviceAlertAction;
  target: DeviceAlertTarget | null;
  timeout: number | null;
}

export interface AlertSlotConfig {
  alert: DeviceAlertData;
}

export const DEFAULT_ALERT_SLOTS: AlertSlotConfig[] = [
  {
    alert: {
      action: DeviceAlertAction.IDENT,
      target: DeviceAlertTarget.ALL,
      timeout: 4000,
    },
  },
  {
    alert: {
      action: DeviceAlertAction.PRIO,
      target: DeviceAlertTarget.OPERATOR,
      timeout: 1250,
    },
  },
  {
    alert: {
      action: DeviceAlertAction.NORMAL,
      target: DeviceAlertTarget.ALL,
      timeout: 3000,
    },
  },
  { alert: { action: DeviceAlertAction.CLEAR, target: null, timeout: null } },
];

//? Device packages

export interface BaseDeviceBundle extends BaseTallyDevice {
  moment: number;
}

export interface DeviceBundle<T> extends BaseDeviceBundle {
  data: T;
}

export interface BaseDevicePackage {}

export interface DeviceStatePackage extends BaseDevicePackage {
  state: TallyState;
  active_sources: SourceMap; // TODO: Implement or remove. Should it be a per bus map?
}

export interface DeviceAlertPackage extends BaseDevicePackage {
  alert: DeviceAlertData;
}

export interface DeviceRuntimeConfigPackage extends BaseDevicePackage {
  runtime: DeviceRuntimeConfig;
  global: GlobalDeviceRuntimeConfig;
}

export interface DeviceTelemetryPackage extends BaseDevicePackage {
  telemetry: DeviceTelemetry;
}
export type DeviceStateBundle = DeviceBundle<DeviceStatePackage>;
export type DeviceAlertBundle = DeviceBundle<DeviceAlertPackage>;
export type DeviceRuntimeConfigBundle = DeviceBundle<DeviceRuntimeConfigPackage>;
export type DeviceTelemetryBundle = DeviceBundle<DeviceTelemetryPackage>;

//? Device Messages are for duplex communication, directly aimed at devices. E.g. discovery (topic negotiation). Before a device has a ConsumerId.
export interface DeviceDiscoveryMessage {
  id: DeviceId;
  info: DeviceInfo;
  telemetry?: DeviceTelemetry;
}

export interface DeviceDiscoveryReplyMessage {
  topic: DeviceAddress;
}

//? Device tools and DTOs
export const defaultGlobalDeviceRuntimeConfig = (): GlobalDeviceRuntimeConfig => ({
  state_on_disconnect: TallyState.WARNING,
});

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
  runtime: DeviceRuntimeConfig;
  telemetry?: DeviceTelemetry;

  constructor(device: Partial<TallyDevice> & Pick<TallyDevice, "id">) {
    const newDevice = { ...defaultTallyDevice(), ...device };
    this.id = newDevice.id;
    this.info = newDevice.info;
    this.logic = newDevice.logic;
    this.runtime = newDevice.runtime;
    this.telemetry = newDevice.telemetry;
  }

  toKey(): DeviceKey {
    return DeviceTools.createKey(this.id.consumer, this.id.device);
  }

  toString(): string {
    return `dev:${this.toKey()}`;
  }

  //? Discovery
  static fromDiscoveryMessage(
    message: DeviceDiscoveryMessage,
    consumer: ConsumerId,
  ): TallyDeviceDto {
    return new TallyDeviceDto({
      info: message.info,
      telemetry: message.telemetry,
      id: {
        consumer,
        device: message.id,
      },
    });
  }

  toDiscoveryReplyMessage(): DeviceDiscoveryReplyMessage {
    return {
      topic: this.id,
    };
  }

  //? Sub Interfaces
  toStored(): StoredTallyDevice {
    return {
      id: this.id,
      info: this.info,
      logic: this.logic,
      runtime: this.runtime,
    };
  }

  //? Serialisation
  serialize(): string {
    return JSON.stringify(this);
  }

  serialiseForStorage(): string {
    return JSON.stringify(this.toStored());
  }

  //? Bundles
  toBaseBundle(): BaseDeviceBundle {
    return {
      id: this.id,
      moment: Date.now(),
    };
  }

  // Use for bundles which have data not in TallyDevice already. e.g. runtime config has its own bundle function.
  toBundle<T extends BaseDevicePackage>(data: T): DeviceBundle<T> {
    return {
      ...this.toBaseBundle(),
      data: data,
    };
  }

  toRuntimeConfigBundle(global: GlobalDeviceRuntimeConfig): DeviceRuntimeConfigBundle {
    return this.toBundle({
      runtime: this.runtime,
      global: global,
    });
  }
}

export abstract class DeviceTools {
  static createKey(consumer: ConsumerId, device: DeviceId): DeviceKey {
    return `${consumer}:${device}` as DeviceKey;
  }

  static toKey(address: DeviceAddress): DeviceKey {
    return this.createKey(address.consumer, address.device);
  }

  static parseKey(key: DeviceKey): DeviceAddress {
    const [consumer, ...deviceParts] = key.split(":");
    return { consumer, device: deviceParts.join(":") };
  }

  static buildDeviceStateBundle(address: DeviceAddress, state: DeviceStatePackage): DeviceStateBundle {
    return {
      id: address,
      moment: Date.now(),
      data: state,
    };
  }

  static buildDeviceAlertBundle(address: DeviceAddress, alert: DeviceAlertPackage): DeviceAlertBundle {
    return {
      id: address,
      moment: Date.now(),
      data: alert,
    };
  }
}
