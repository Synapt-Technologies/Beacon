import { EventEmitter } from "node:events";
import { Logger } from "../../logging/Logger";
import {
  type TallyDeviceMap,
  type DeviceRuntimeConfig,
  type TallyDevice,
  type DeviceAddress,
  DeviceTools,
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
  device_removed: [address: DeviceAddress];
};

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
  // TODO: Move above to AbstractConnection

  protected devices: TallyDeviceMap = new Map();

  getAvailableDevices(): Array<TallyDevice> {
    return Array.from(this.devices.values());
  }
  getDevice(address: DeviceAddress): TallyDevice | null {
    return this.devices.get(DeviceTools.toKey(address)) || null;
  }

  //! Refactor below:

  protected _addDevice(device: TallyDevice, override: boolean = false) {
    device.id.consumer = this.config.id;
    const key = DeviceTools.toKey(device.id);

    if (this.devices.has(key) && !override) {
      return;
    }

    this.devices.set(key, device);
    this.info.device_count = this.devices.size;
    this.store.saveDevice(device);
    this.setTallyDevice(device);
    this.sendDeviceConfig(device);
    (this as EventEmitter<ConsumerEvents>).emit("device_discovery", device);
  }

  setDeviceRuntimeConfig(
    address: DeviceAddress,
    config: Partial<DeviceRuntimeConfig>,
  ): void {
    const key = this.getDeviceKey(address);

    const device = this.devices.get(key);
    if (!device) {
      this.logger.warn(
        `Attempted to set runtime config for unknown device at address:`,
        address,
      );
      return;
    }

    if (config.name !== undefined) device.name = config.name;
    if (config.brightness !== undefined) device.brightness = config.brightness;
    if (config.flip !== undefined) device.flip = config.flip;
    this.store.saveDevice(device);
    this.sendDeviceConfig(device);
    (this as EventEmitter<ConsumerEvents>).emit("device_update", device);
    this.logger.debug(`Device ${key} runtime config updated:`, config);
  }
  setDevicePatch(
    address: DeviceAddress,
    patch: Array<GlobalTallySource>,
  ): void {
    const key = this.getDeviceKey(address);

    const device = this.devices.get(key);
    if (!device) {
      this.logger.warn(
        `Attempted to set patch:`,
        patch,
        `for unknown device at address:`,
        address,
      );
      return;
    }

    device.patch = patch;
    this.store.saveDevice(device);
    this.setTallyDevice(device);
    (this as EventEmitter<ConsumerEvents>).emit("device_update", device);
    this.logger.debug(`Device ${key} set patch to:`, patch);
  }
  deleteDevice(address: DeviceAddress): void {
    const key = this.getDeviceKey(address);

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

  abstract setDeviceAlert(
    address: DeviceAddress,
    type: DeviceAlertState,
    target: DeviceAlertTarget,
    time: number,
  ): void;

  protected setTallyDevice(device: TallyDevice): void {
    let newState = this.baseState; // Default: NONE, or configured state-on-disconnect

    for (const patch of device.patch) {
      const parsedSource = GlobalSourceTools.create(
        patch.producer,
        patch.source,
      );

      if (this.tallyState.program.has(parsedSource)) {
        newState = DeviceTallyState.PROGRAM;
        break;
      }
      if (this.tallyState.preview.has(parsedSource)) {
        newState = DeviceTallyState.PREVIEW;
      }
    }

    if (device.state !== newState || !device.last_update) {
      device.last_update = Date.now();
      device.state = newState;
      this.logger.debug(
        `Device ${this.getDeviceKey(device.id)} state changed to ${DeviceTallyState[device.state]}`,
      );
      (this as EventEmitter<ConsumerEvents>).emit("device_update", device);

      // TODO: sendDevice that each consumer implements, to make consumers that don't send device config easier?
      this.sendDeviceTally(device);
      this.sendDeviceConfig(device);
    }
  }

  protected abstract sendDeviceTally(device: TallyDevice): void;
  protected sendDeviceConfig(_device: TallyDevice): void {} // TODO: Right place?

  consumeTally(state: TallyState): void {
    this.tallyState = state;

    this.logger.debug(
      "Consumed TallyState:",
      GlobalSourceTools.serialize(state),
    );

    for (const device of this.devices.values()) {
      this.setTallyDevice(device);
    }
  }

  abstract init(): void | Promise<void>;
  abstract destroy(): void | Promise<void>;
}
