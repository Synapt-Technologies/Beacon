import { EventEmitter } from "node:events";
import { Logger } from "../../logging/Logger";
import {
  type TallyDevice,
  type DeviceAddress,
  DeviceTools,
  TallyDeviceDto,
  type DeviceStatePackage,
  type DeviceStateBundle,
  type DeviceAlertPackage,
  type DeviceAlertBundle,
  type DeviceRuntimeConfigBundle,
  type DeviceTelemetryBundle,
  type DeviceDiscoveryMessage,
  type DeviceDiscoveryReplyMessage,
  type DeviceRuntimeConfig,
  type TallyDeviceDtoMap,
  type GlobalDeviceRuntimeConfig,
  defaultGlobalDeviceRuntimeConfig,
  type DeviceId,
} from "../types/DeviceTypes";
import { ConsumerStore } from "../../database/ConsumerStore";
import type {
  ConsumerConfig,
  ConsumerId,
  ConsumerInfo,
} from "../types/ConsumerTypes";
import { ConnectionState } from "../types/CommonTypes";

export type ConsumerEvents = {
  info_update: [ConsumerInfo];
  device_discovery: [device: TallyDevice];
  device_update: [device: TallyDevice];
  device_telemetry: [device: TallyDevice];
  device_removed: [address: DeviceAddress];
};
/*
- New device discovery       -> addDevice               -> _addDevice           -> *device_discovery*   -> send discovery reply
- Existing device discovery  -> addDevice               -> _addDevice           -> *device_update*      -> send discovery reply
- Received device telemetry  -> _processDeviceTelemetry -> *device_telemetry*
- Device removed             -> deleteDevice            -> _deleteDevice        -> *device_removed*
*/

/*
  sendDeviceState: stateless. Not stored
  sendDeviceAlert: stateless. Not stored.
  applyDeviceRuntimeConfig: stateful. Stored and processed in the consumer.
*/

// TODO: Add a way to send global/per-device custom fields once they are implemented. Should be stateless on the consumer.

// TODO: Maybe IConnection to force getId and get and setName and other shared ops like db?
export abstract class AbstractConsumer<
  T extends ConsumerEvents & Record<string, unknown[]> = ConsumerEvents,
> extends EventEmitter<T> {
  // TODO: Con and prod types probably not in AbstractConnection. Check if needed at all. Might be usefull when adding other non-tally producer types.
  protected readonly conType: string = "CONS";
  protected readonly logLabels: readonly string[] = [this.conType];

  protected _logger: Logger;

  protected _store: ConsumerStore;

  protected _config: ConsumerConfig;
  protected abstract _getDefaultConfig(): ConsumerConfig;

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

  constructor(config: Partial<ConsumerConfig>) {
    super();

    this._config = { ...this._getDefaultConfig(), ...config };

    this._logger = new Logger(["TALLY", ...this.logLabels, this._config.id]);

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

  protected _destroying = false;
  protected markDestroying(): void {
    this._destroying = true;
  }
  protected isDestroying(): boolean {
    return this._destroying;
  }

  async init(): Promise<void> {
    await this._init();
  }
  protected _init(): void | Promise<void> {}

  async destroy(): Promise<void> {
    this._logger.debug("Destroying...");
    this.markDestroying();
    await this._destroy();
  }
  protected _destroy(): void | Promise<void> {}

  // TODO: Move above to AbstractConnection
  // TODO emitInfoUpdate also in AbstractConnection? Or as abstract?
  protected _emitInfoUpdate(): void {
    if (this._destroying) return;
    (this as EventEmitter<ConsumerEvents>).emit("info_update", this._info);
    this._logger.debug(`Info updated.`);
  }

  protected _globalDeviceRuntimeConfig: GlobalDeviceRuntimeConfig =
    defaultGlobalDeviceRuntimeConfig();

  getGlobalDeviceRuntimeConfig(): GlobalDeviceRuntimeConfig {
    return this._globalDeviceRuntimeConfig;
  }

  setGlobalDeviceRuntimeConfig(config: GlobalDeviceRuntimeConfig): void {
    this._globalDeviceRuntimeConfig = config;
    this._logger.debug(
      `Global device runtime config updated:`,
      this._globalDeviceRuntimeConfig,
    );
    for (const device of this._devices.values()) {
      try {
        this._sendDeviceRuntimeConfig(
          device.toRuntimeConfigBundle(this._globalDeviceRuntimeConfig),
        );
      } catch (error) {
        this._logger.error(
          `Error sending runtime config for device ${device.toKey()}:`,
          error,
        );
      }
    }
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
      this._logger.error(`Error saving device ${device}:`, error);
    }
  }

  // ? Internal use and debug. Adds a device as if discovered. Should not be used to broadcast another consumer's device.
  public addDevice(device: TallyDeviceDto, override: boolean = false) {
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
    this._addDevice(newDevice, override);

    this.applyDeviceRuntimeConfig(newDevice.id, newDevice.runtime);

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

  // TODO: Check function fields.
  protected _addDevice(newDevice: TallyDeviceDto, override: boolean = false) {}

  sendDeviceState(address: DeviceAddress, pckg: DeviceStatePackage): void {
    const key = DeviceTools.toKey(address);
    this._logger.debug(`Sending state for device ${key}:`, pckg);

    const bundle = DeviceTools.buildDeviceStateBundle(address, pckg);

    try {
      this._sendDeviceState(bundle);
    } catch (error) {
      this._logger.error(`Error sending state for device ${key}:`, error);
    }
  }

  protected abstract _sendDeviceState(bundle: DeviceStateBundle): void;

  sendDeviceAlert(address: DeviceAddress, alert: DeviceAlertPackage): void {
    const key = DeviceTools.toKey(address);
    this._logger.debug(`Sending alert for device ${key}:`, alert);

    const bundle = DeviceTools.buildDeviceAlertBundle(address, alert);

    try {
      this._sendDeviceAlert(bundle);
    } catch (error) {
      this._logger.error(`Error sending alert for device ${key}:`, error);
    }
  }

  protected abstract _sendDeviceAlert(bundle: DeviceAlertBundle): void;

  // TODO: SendDeviceFields once implemented on device?

  applyDeviceRuntimeConfig(
    address: DeviceAddress,
    runtime: DeviceRuntimeConfig,
  ): void {
    const key = DeviceTools.toKey(address);
    this._logger.debug(`Sending runtime config for device ${key}:`, runtime);

    const device = this._devices.get(key);
    if (!device) {
      this._logger.warn(
        `Attempted to set runtime config for unknown device at address:`,
        address,
      );
      return;
    }

    if (device.runtime !== runtime) {
      this._logger.debug(
        `Storing new config for device ${key}. change:`,
        device.runtime,
        `->`,
        runtime,
      );
      device.runtime = runtime;
      try {
        this._store.saveDevice(device);
      } catch (error) {
        this._logger.error(
          `Error saving runtime config for device ${key}:`,
          error,
        );
      }
    }

    try {
      this._sendDeviceRuntimeConfig(
        device.toRuntimeConfigBundle(this._globalDeviceRuntimeConfig),
      );
    } catch (error) {
      this._logger.error(
        `Error sending runtime config for device ${key}:`,
        error,
      );
    }
  }

  // NO-OP, not all consumers support discovery.
  // TODO: Move to an interface? NetServerConsumer? Abstract?
  protected _sendDeviceRuntimeConfig(bundle: DeviceRuntimeConfigBundle): void {}

  // TODO: Not all consumers have discovery. Add the bottom two functions to an interface?
  protected _processDeviceDiscovery(message: DeviceDiscoveryMessage): void {
    this._logger.debug(`Processing discovered device ${message.id}:`, message);

    const newDevice: TallyDeviceDto = TallyDeviceDto.fromDiscoveryMessage(
      message,
      this._config.id,
    );

    this.addDevice(newDevice);

    this._sendDiscoveryReply(
      newDevice.id.device,
      newDevice.toDiscoveryReplyMessage(),
    );
  }

  // NO-OP, not all consumers support discovery.
  // TODO: Move to an interface? NetServerConsumer? Abstract?
  protected _sendDiscoveryReply(
    id: DeviceId,
    message: DeviceDiscoveryReplyMessage,
  ) {}

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
      this._logger.warn(`Attempted to delete unknown device at address:`, key);
      return;
    }

    this._deleteDevice(address);

    this._devices.delete(key);
    this._info.device_count = this._devices.size;

    try {
      this._store.deleteDevice(address);
    } catch (error) {
      this._logger.error(`Error deleting device ${key}:`, error);
    }
    (this as EventEmitter<ConsumerEvents>).emit("device_removed", address);
    this._logger.debug(`Device ${key} deleted.`);

    this._emitInfoUpdate();
  }

  // No-op to enable optional cleanup override.
  protected _deleteDevice(address: DeviceAddress): void {
    /* empty */
  }
}
