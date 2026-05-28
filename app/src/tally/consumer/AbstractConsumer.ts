import { EventEmitter } from "node:events";
import { Logger } from "../../logging/Logger";
import {
  type TallyDeviceMap,
  type DeviceRuntimeConfig,
  type TallyDevice,
  type DeviceAddress,
  DeviceTools,
  TallyDeviceDto,
  type DeviceStatePackage,
  type DeviceAlertPackage,
  type DeviceDiscoveryBundle,
  type DeviceDiscoveryReplyBundle,
  type DeviceRuntimeConfigBundle,
  type DeviceTelemetryBundle,
} from "../types/DeviceTypes";
import { ConsumerStore } from "../../database/ConsumerStore";
import type {
  ConsumerConfig,
  ConsumerId,
  ConsumerInfo,
} from "../types/ConsumerTypes";
import { ConnectionState, type WithRequired } from "../types/CommonTypes";

// TODO: Add (consumer) info_update?
export type ConsumerEvents = {
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

  protected logger: Logger;

  protected store: ConsumerStore;

  protected config: ConsumerConfig;
  protected abstract getDefaultConfig(): Omit<ConsumerConfig, "id">;

  protected info: ConsumerInfo = {
    state: ConnectionState.OFFLINE,
    device_count: 0,
  };

  getConfig(): ConsumerConfig {
    return this.config;
  }
  getId(): ConsumerId {
    return this.config.id;
  }
  setName(name: string): void {
    this.config.name = name;
  }
  getName(): string {
    return this.config.name;
  }

  getInfo(): ConsumerInfo {
    return this.info;
  }

  constructor(config: WithRequired<ConsumerConfig, "id">) {
    super();

    this.config = { ...this.getDefaultConfig(), ...config };

    this.logger = new Logger(["Tally", this.conType, this.config.id]);

    this.checkConfig(this.config);

    //? Not in AbstractConnection (Maybe store should)
    this.store = new ConsumerStore(this.config.id);

    const storedDevices = this.store.loadDevices();
    if (storedDevices.size > 0) {
      this.devices = storedDevices;
      this.info.device_count = storedDevices.size;
      this.logger.debug(`Loaded ${storedDevices.size} stored device(s).`);
    }
    //? End Not in AbstractConnection
  }

  protected checkConfig(config: ConsumerConfig) {
    if (!config.id || config.id == "")
      this.logger.fatal(
        `Invalid consumer ID provided. Submitted config:`,
        config,
      );
    if (config.name == null || config.name == "")
      this.logger.fatal(
        `System name was not provided. Submitted config:`,
        config,
      );
  }

  abstract init(): void | Promise<void>;
  abstract destroy(): void | Promise<void>;

  // TODO: Move above to AbstractConnection

  protected devices: TallyDeviceMap = new Map();

  getAvailableDevices(): Array<TallyDevice> {
    return Array.from(this.devices.values());
  }
  getDevice(address: DeviceAddress): TallyDevice | null {
    return this.devices.get(DeviceTools.toKey(address)) || null;
  }

  protected _addDevice(device: TallyDevice, override: boolean = false) {
    const id = { ...device.id, consumer: this.config.id };
    const key = DeviceTools.toKey(id);
    const existing = this.devices.get(key);

    const newDevice = new TallyDeviceDto({
      ...device,
      id,
    });

    if (existing) {
      newDevice.telemetry ??= existing.telemetry;

      if (!override) {
        newDevice.logic = existing.logic;
        newDevice.runtime = existing.runtime;
        this.logger.debug(
          `Device at address ${key} already exists. Merging with existing device:`,
          existing,
          `->`,
          newDevice,
        );
      } else {
        this.logger.debug(
          `Device at address ${key} already exists. Overriding with new device:`,
          existing,
          `->`,
          newDevice,
        );
      }
    }

    this.devices.set(key, newDevice);
    this.info.device_count = this.devices.size;
    // TODO: Try catch needed?
    this.store.saveDevice(newDevice);

    if (existing) {
      (this as EventEmitter<ConsumerEvents>).emit("device_update", newDevice);
    } else {
      (this as EventEmitter<ConsumerEvents>).emit(
        "device_discovery",
        newDevice,
      );
    }

    // TODO: Check if this is needed.
    this._sendDeviceRuntimeConfig(id, newDevice.toRuntimeConfigBundle());
  }

  sendDeviceState(address: DeviceAddress, pckg: DeviceStatePackage): void {
    this.logger.debug(`Sending state for device ${address}:`, pckg);

    try {
      this._sendDeviceState(address, pckg);
    } catch (error) {
      this.logger.error(`Error sending state for device ${address}:`, error);
    }
  }

  protected abstract _sendDeviceState(
    address: DeviceAddress,
    pckg: DeviceStatePackage,
  ): void;

  sendDeviceAlert(address: DeviceAddress, alert: DeviceAlertPackage): void {
    this.logger.debug(`Sending alert for device ${address}:`, alert);

    try {
      this._sendDeviceAlert(address, alert);
    } catch (error) {
      this.logger.error(`Error sending alert for device ${address}:`, error);
    }
  }

  protected abstract _sendDeviceAlert(
    address: DeviceAddress,
    alert: DeviceAlertPackage,
  ): void;

  protected _processDeviceDiscovery(bundle: DeviceDiscoveryBundle): void {
    this.logger.debug(`Processing discovered device ${bundle.id}:`, bundle);

    const newDevice: TallyDeviceDto = TallyDeviceDto.fromDiscoveryBundle(
      bundle,
      this.config.id,
    );

    this._addDevice(newDevice);

    this._sendDiscoveryReply(newDevice.toDiscoveryReplyBundle());
  }

  protected abstract _sendDiscoveryReply(
    bundle: DeviceDiscoveryReplyBundle,
  ): void;

  sendDeviceRuntimeConfig(
    address: DeviceAddress,
    bundle: DeviceRuntimeConfigBundle,
  ): void {
    this.logger.debug(`Setting runtime config for device ${address}:`, bundle);

    try {
      this._sendDeviceRuntimeConfig(address, bundle);
    } catch (error) {
      this.logger.error(
        `Error setting runtime config for device ${address}:`,
        error,
      );
    }
  }

  protected abstract _sendDeviceRuntimeConfig(
    address: DeviceAddress,
    bundle: DeviceRuntimeConfigBundle,
  ): void;

  protected _processDeviceTelemetry(bundle: DeviceTelemetryBundle): void {
    this.logger.debug(`Processing telemetry for device ${bundle.id}:`, bundle);

    const key = DeviceTools.toKey(bundle.id);
    const device = this.devices.get(key);
    if (!device) {
      this.logger.warn(
        `Received telemetry for unknown device at address:`,
        bundle.id,
      );
      return;
    }

    device.telemetry = bundle.telemetry;
    this.store.saveDevice(device);

    (this as EventEmitter<ConsumerEvents>).emit("device_telemetry", device);
  }

  deleteDevice(address: DeviceAddress): void {
    const key = DeviceTools.toKey(address);

    if (!this.devices.has(key)) {
      this.logger.warn(
        `Attempted to delete unknown device at address:`,
        address,
      );
      return;
    }

    this.devices.delete(key);
    this.info.device_count = this.devices.size;
    this.store.deleteDevice(address);
    (this as EventEmitter<ConsumerEvents>).emit("device_removed", address);
    this.logger.debug(`Device ${key} deleted.`);
  }
}
