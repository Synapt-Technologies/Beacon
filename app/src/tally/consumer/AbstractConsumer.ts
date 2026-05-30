import { EventEmitter } from "node:events";
import { Logger } from "../../logging/Logger";
import {
  type TallyDevice,
  type DeviceAddress,
  DeviceTools,
  TallyDeviceDto,
  type DeviceStatePackage,
  type DeviceAlertPackage,
  type DeviceRuntimeConfigBundle,
  type DeviceTelemetryBundle,
  type DeviceDiscoveryMessage,
  type DeviceDiscoveryReplyMessage,
  type DeviceRuntimeConfig,
  type TallyDeviceDtoMap,
} from "../types/DeviceTypes";
import { ConsumerStore } from "../../database/ConsumerStore";
import type {
  ConsumerConfig,
  ConsumerId,
  ConsumerInfo,
} from "../types/ConsumerTypes";
import { ConnectionState, type WithRequired } from "../types/CommonTypes";

export type ConsumerEvents = {
  info_update: [ConsumerInfo];
  device_discovery: [device: TallyDevice];
  device_update: [device: TallyDevice];
  device_telemetry: [device: TallyDevice];
  device_removed: [address: DeviceAddress];
};
/*
- New device discovery       -> _addDevice             -> *device_discovery*  -> send discovery reply
- Existing device discovery  -> _addDevice             -> *device_update*     -> send discovery reply
- Received device telemetry  -> processDeviceTelemetry -> *device_telemetry*
- Device removed             -> deleteDevice           -> *device_removed*
*/

// TODO: Maybe IConnection to force getId and get and setName and other shared ops like db?
export abstract class AbstractConsumer<
T extends ConsumerEvents & Record<string, unknown[]> = ConsumerEvents,
> extends EventEmitter<T> {
  // TODO: In AbstractConnection make some sort of array to support flexible lable count.
  protected readonly conType: string = "CONS";
  
  protected _logger: Logger;
  
  protected _store: ConsumerStore;
  
  protected _config: ConsumerConfig;
  protected abstract _getDefaultConfig(): Omit<ConsumerConfig, "id">;
  
  protected _info: ConsumerInfo = {
    state: ConnectionState.OFFLINE,
    device_count: 0,
  };
  
  getConfig(): ConsumerConfig {
    return this._config;
  }
  getId(): ConsumerId {
    return this._config.id;
  }
  setName(name: string): void {
    this._config.name = name;
  }
  getName(): string {
    return this._config.name;
  }
  
  getInfo(): ConsumerInfo {
    return this._info;
  }
  
  constructor(config: WithRequired<ConsumerConfig, "id">) {
    super();
    
    this._config = { ...this._getDefaultConfig(), ...config };
    
    this._logger = new Logger(["Tally", this.conType, this._config.id]);
    
    this._checkConfig(this._config);
    
    //? Not in AbstractConnection (Maybe store should)
    this._store = new ConsumerStore(this._config.id);
    
    const storedDevices = this._store.loadDevices();
    if (storedDevices.size > 0) {
      for (const [key, device] of storedDevices) {
        this._devices.set(key, new TallyDeviceDto(device));
      }
      this._info.device_count = this._devices.size;
      this._logger.debug(`Loaded ${storedDevices.size} stored device(s).`);
    }
    //? End Not in AbstractConnection
  }
  
  protected _checkConfig(config: ConsumerConfig) {
    if (!config.id)
      this._logger.fatal(`Invalid ID provided. Submitted config:`, config);
    if (!config.name)
      this._logger.fatal(`Name was not provided. Submitted config:`, config);
  }
  
  private _destroying = false;
  markDestroying(): void {
    this._destroying = true;
  }
  isDestroying(): boolean {
    return this._destroying;
  }
  
  abstract init(): void | Promise<void>;
  abstract destroy(): void | Promise<void>;
  
  // TODO: Move above to AbstractConnection
  // TODO emitInfoUpdate also in AbstractConnection? Or as abstract?
  protected _emitInfoUpdate(): void {
    if (this._destroying) return;
    (this as EventEmitter<ConsumerEvents>).emit("info_update", this._info);
    this._logger.debug(`Info updated.`);
  }
  
  protected _devices: TallyDeviceDtoMap = new Map();
  
  getAvailableDevices(): Array<TallyDevice> {
    return Array.from(this._devices.values());
  }
  getDevice(address: DeviceAddress): TallyDevice | null {
    return this._devices.get(DeviceTools.toKey(address)) ?? null;
  }
  
  protected _saveDevice(device: TallyDeviceDto): void {
    this._devices.set(device.toKey(), device);
    this._info.device_count = this._devices.size;
    try {
      this._store.saveDevice(device);
    } catch (error) {
      this._logger.error(
        `Error saving device ${device}:`,
        error,
      );
    }
  }
  
  protected _addDevice(device: TallyDeviceDto, override: boolean = false) {
    const newDevice = new TallyDeviceDto({
      ...device,
      id: { ...device.id, consumer: this._config.id },
    });
    const key = newDevice.toKey();
    const existing = this._devices.get(key);
    
    if (existing) {
      newDevice.telemetry ??= existing.telemetry;
      
      if (!override) {
        newDevice.logic = existing.logic;
        newDevice.runtime = existing.runtime;
        this._logger.debug(
          `Device at address ${key} already exists. Merging with existing device:`,
          existing,
          `->`,
          newDevice,
        );
      } else {
        this._logger.debug(
          `Device at address ${key} already exists. Overriding with new device:`,
          existing,
          `->`,
          newDevice,
        );
      }
    }
    
    this._saveDevice(newDevice);
    
    this.sendDeviceRuntimeConfig(
      newDevice.id,
      newDevice.runtime,
    );
    
    if (existing) {
      (this as EventEmitter<ConsumerEvents>).emit("device_update", newDevice);
    } else {
      (this as EventEmitter<ConsumerEvents>).emit(
        "device_discovery",
        newDevice,
      );
      this._emitInfoUpdate();
    }
  }
  
  sendDeviceState(address: DeviceAddress, pckg: DeviceStatePackage): void {
    const key = DeviceTools.toKey(address);
    this._logger.debug(
      `Sending state for device ${key}:`,
      pckg,
    );
    
    try {
      this._sendDeviceState(address, pckg);
    } catch (error) {
      this._logger.error(
        `Error sending state for device ${key}:`,
        error,
      );
    }
  }
  
  protected abstract _sendDeviceState(
    address: DeviceAddress,
    pckg: DeviceStatePackage,
  ): void;
  
  sendDeviceAlert(address: DeviceAddress, alert: DeviceAlertPackage): void {
    const key = DeviceTools.toKey(address);
    this._logger.debug(
      `Sending alert for device ${key}:`,
      alert,
    );
    
    try {
      this._sendDeviceAlert(address, alert);
    } catch (error) {
      this._logger.error(
        `Error sending alert for device ${key}:`,
        error,
      );
    }
  }
  
  protected abstract _sendDeviceAlert(
    address: DeviceAddress,
    alert: DeviceAlertPackage,
  ): void;
  
  protected _processDeviceDiscovery(bundle: DeviceDiscoveryMessage): void {
    this._logger.debug(`Processing discovered device ${bundle.id}:`, bundle);
    
    const newDevice: TallyDeviceDto = TallyDeviceDto.fromDiscoveryMessage(
      bundle,
      this._config.id,
    );
    
    this._addDevice(newDevice);
    
    this._sendDiscoveryReply(newDevice.toDiscoveryReplyMessage());
  }
  
  protected abstract _sendDiscoveryReply(
    message: DeviceDiscoveryReplyMessage,
  ): void;
  
  sendDeviceRuntimeConfig(
    address: DeviceAddress,
    runtime: DeviceRuntimeConfig,
  ): void {
    const key = DeviceTools.toKey(address);
    this._logger.debug(`Setting runtime config for device ${key}:`, runtime);

    const device = this._devices.get(key);
    if (!device) {
      this._logger.warn(
        `Attempted to set runtime config for unknown device at address:`,
        address,
      );
      return;
    }
    
    device.runtime = runtime;
    try {
      this._store.saveDevice(device);
    } catch (error) {
      this._logger.error(`Error saving runtime config for device ${key}:`, error);
    }
    
    try {
      this._sendDeviceRuntimeConfig(address, device.toRuntimeConfigBundle());
    } catch (error) {
      this._logger.error(`Error sending runtime config for device ${key}:`, error);
    }
  }
  
  protected abstract _sendDeviceRuntimeConfig(
    address: DeviceAddress,
    bundle: DeviceRuntimeConfigBundle,
  ): void;
  
  protected _processDeviceTelemetry(bundle: DeviceTelemetryBundle): void {
    this._logger.debug(
      `Processing telemetry for device ${DeviceTools.toKey(bundle.id)}:`,
      bundle,
    );
    
    const key = DeviceTools.toKey(bundle.id);
    const device = this._devices.get(key);
    if (!device) {
      this._logger.warn(
        `Received telemetry for unknown device at address:`,
        bundle.id,
      );
      return;
    }
    
    device.telemetry = bundle.data.telemetry;
    
    (this as EventEmitter<ConsumerEvents>).emit("device_telemetry", device);
  }
  
  deleteDevice(address: DeviceAddress): void {
    const key = DeviceTools.toKey(address);
    
    if (!this._devices.has(key)) {
      this._logger.warn(
        `Attempted to delete unknown device at address:`,
        key,
      );
      return;
    }
    
    this._deleteDevice(address);

    this._devices.delete(key);
    this._info.device_count = this._devices.size;
    
    try {
      this._store.deleteDevice(address);
    } catch (error) {
      this._logger.error(
        `Error deleting device ${key}:`,
        error,
      );
    }
    (this as EventEmitter<ConsumerEvents>).emit("device_removed", address);
    this._logger.debug(`Device ${key} deleted.`);
    
    this._emitInfoUpdate();
  }
  
  // No-op to enable optional cleanup override.
  protected _deleteDevice(address: DeviceAddress): void {/* empty */}
}
