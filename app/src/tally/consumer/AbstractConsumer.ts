import { EventEmitter } from "events";
import { Logger } from "../../logging/Logger";
import { type DeviceAddress, DeviceAddressDto, type DeviceAlertBundle, type DeviceId, type DeviceKey, type DeviceTallyBundle, type TallyDevice } from "../types/DeviceTypes";
import type { ConsumerId } from "../types/ConsumerTypes";
import { ConsumerStore } from "../../database/ConsumerStore";
import { HardwareVersion, type SystemInfo } from "../../types/SystemInfo";


export enum ConsumerStatus {
    DISABLED = "Disabled",
    OFFLINE = "Offline",
    ONLINE = "Online",
    ERROR = "Error"
}

export interface ConsumerInfo {
    status: ConsumerStatus;
    device_count: number;
}

export interface ConsumerConfig {
    id: ConsumerId;
    name: string;
    system_info: SystemInfo;
}

export type ConsumerEvents = {
    device_update:  [device: TallyDevice];
    device_added:   [device: TallyDevice];
    device_removed: [address: DeviceAddress];
}

// TODO: Maybe IConnection to force getId and get and setName and other shared ops like db?
export abstract class AbstractConsumer<T extends ConsumerEvents & Record<string, any[]> = ConsumerEvents> extends EventEmitter<T> {
    
    protected readonly conType: string = "CONS";

    protected logger: Logger;

    protected store: ConsumerStore;

    protected devices: Map<DeviceKey, TallyDevice> = new Map();

    protected config: Required<ConsumerConfig>;

    // Static + function: Static removes recursion, function makes it so the parent constructor gets the child's values.
    public static readonly DefaultConfig: Required<ConsumerConfig> = {
        id: "",
        name: "Consumer",
        system_info: {
            hardware: HardwareVersion.UNKNOWN
        },
    };

    protected abstract getDefaultConfig(): Required<ConsumerConfig>;

    protected info: ConsumerInfo = { 
        status: ConsumerStatus.OFFLINE, 
        device_count: 0 
    };


    getConfig(): ConsumerConfig {
        return this.config;
    }

    getInfo(): ConsumerInfo {
        return this.info;
    }

    constructor(config: Partial<ConsumerConfig>) {
        super();

        this.config = {...this.getDefaultConfig(), ...config};

        this.logger = new Logger(["Tally", this.conType, this.config.id]);

        this.store = new ConsumerStore(this.config.id);

        this.checkConfig(this.config);

        const storedDevices = this.store.loadDevices();
        if (storedDevices.size > 0) {
            this.devices = storedDevices;
            this.info.device_count = storedDevices.size;
            this.logger.debug(`Loaded ${storedDevices.size} stored device(s).`);
        }

    }
        
    protected checkConfig(config: ConsumerConfig) {
        if (!config.id || config.id == "")
            this.logger.fatal(`Invalid consumer ID provided. Submitted config:`, config);
        if (config.system_info == null)
            this.logger.fatal(`System info was not provided. Submitted config:`, config);
    }


    getAvailableDevices(): Array<TallyDevice> {
        return Array.from(this.devices.values());
    }
    getDevice(address: DeviceAddress): TallyDevice | null {
        return this.devices.get(DeviceAddressDto.from(address).toKey()) || null;
    }

    protected _addDevice(device: TallyDevice) {

        device.id.consumer = this.config.id;
        const key = DeviceAddressDto.from(device.id).toKey();

        this.devices.set(key, device);
        this.info.device_count = this.devices.size;
        this.store.saveDevice(device);

        (this as EventEmitter<ConsumerEvents>).emit('device_added', device);
        this.logger.debug(`Device ${key} added.`);
    }


    deleteDevice(address: DeviceAddress): void {
        const key = DeviceAddressDto.from(address).toKey();

        if (!this.devices.has(key)) {
            this.logger.warn(`Attempted to delete unknown device at address:`, address);
            return;
        }

        this.devices.delete(key);
        this.info.device_count = this.devices.size;
        this.store.deleteDevice(address);
        (this as EventEmitter<ConsumerEvents>).emit('device_removed', address);
        this.logger.debug(`Device ${key} deleted.`);
    }

    updateDevice(device: TallyDevice): void {

        const key = DeviceAddressDto.from(device.id).toKey();

        if (!this.devices.has(key)) {
            this.logger.warn(`Attempted to update unknown device at address:`, device.id);
            return;
        }

        this.devices.set(key, device);
        this.store.saveDevice(device);
        (this as EventEmitter<ConsumerEvents>).emit('device_update', device);
        this.logger.debug(`Device ${key} updated.`);
    }

    abstract sendDeviceAlert(bundle: DeviceAlertBundle): void;
    abstract sendDeviceState(bundle: DeviceTallyBundle): void;


    abstract init(): void | Promise<void>;
    abstract destroy(): void | Promise<void>;
    
    getId(): ConsumerId {
        return this.config.id;
    }

    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name;
    }

}