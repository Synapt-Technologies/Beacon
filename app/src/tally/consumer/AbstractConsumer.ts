import { EventEmitter } from "node:events";
import { GlobalSourceTools, type GlobalTallySource, type TallyState } from "../types/ProducerStates";
import { Logger } from "../../logging/Logger";
import { type ConsumerId, type DeviceAddress, DeviceAlertState, DeviceAlertTarget, type DeviceName, DeviceTallyState, type TallyDevice } from "../types/ConsumerStates";
import { ConsumerStore } from "../../database/ConsumerStore";
import type { SystemInfo } from "../../types/SystemInfo";


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
    id?: ConsumerId;
    name?: string;
    system_info?: SystemInfo;
}

export type ConsumerEvents = {
    device_update: [device: TallyDevice];
    device_removed: [address: DeviceAddress];
}

// TODO: Maybe IConnection to force getId and get and setName and other shared ops like db?
export abstract class AbstractConsumer<T extends ConsumerEvents & Record<string, any[]> = ConsumerEvents> extends EventEmitter<T> {
    
    protected readonly conType: string = "CONS";

    protected logger: Logger;

    protected store: ConsumerStore;

    protected devices: Map<string, TallyDevice> = new Map();

    protected config: Required<ConsumerConfig>;

    // Static + function: Static removes recursion, function makes it so the parent constructor gets the child's values.
    public static readonly DefaultConfig: Required<ConsumerConfig> = {
        id: "",
        name: "Consumer",
        // system_info: null, // TODO: Remove default system info.
        system_info: {
            name: "Beacon-Tally Base"
        }
    };

    protected info: ConsumerInfo = { 
        status: ConsumerStatus.OFFLINE, 
        device_count: 0 
    };

    protected abstract getDefaultConfig(): Required<ConsumerConfig>;

    getConfig(): ConsumerConfig {
        return this.config;
    }

    getInfo(): ConsumerInfo {
        return this.info;
    }

    constructor(config: ConsumerConfig) {
        super();

        this.config = {...this.getDefaultConfig(), ...config};

        this.logger = new Logger(["Tally", this.conType, this.config.id]);

        this.store = new ConsumerStore(this.config.id);

        const storedDevices = this.store.loadDevices();
        if (storedDevices.size > 0) {
            this.devices = storedDevices;
            this.info.device_count = storedDevices.size;
            this.logger.debug(`Loaded ${storedDevices.size} stored device(s).`);
        }

        this.checkConfig(this.config);
    }

    protected tallyState: TallyState = {
        program: new Set<string>(),
        preview: new Set<string>()
    };

    protected baseState: DeviceTallyState = DeviceTallyState.NONE;

    setBaseState(state: DeviceTallyState): void {
        this.baseState = state;
        for (const device of this.devices.values()) {
            this.setTallyDevice(device);
        }
    }
        
    protected checkConfig(config: ConsumerConfig) {
        if (!config.id || config.id == "")
            this.logger.fatal(`Invalid consumer ID provided. Submitted config:`, config);
        if (config.system_info == null)
            this.logger.fatal(`System info was not provided. Submitted config:`, config);
    }

    protected getDeviceKey(address: DeviceAddress): string {
        return `${address.consumer}:${address.device}`;
    }

    protected getDeviceAddress(key: string): DeviceAddress {
        
        const parts = key.split(":");
        const consumer = parts.shift() || ""; // Take the first part
        const device = parts.join(":");    // Put everything else back together
        return { consumer, device };
    }

    getAvailableDevices(): Array<TallyDevice> {
        return Array.from(this.devices.values());
    }
    getDevice(address: DeviceAddress): TallyDevice | null {
        return this.devices.get(this.getDeviceKey(address)) || null;
    }

    protected _addDevice(device: TallyDevice) {

        device.id.consumer = this.config.id;
        const key = this.getDeviceKey(device.id);

        this.devices.set(key, device);
        this.info.device_count = this.devices.size;
        this.store.saveDevice(device);
        this.setTallyDevice(device);
    }
    setDeviceName(address: DeviceAddress, name: DeviceName): void {
        const key = this.getDeviceKey(address);
        
        const device = this.devices.get(key);
        if (!device){
            this.logger.warn(`Attempted to set name:`, name, `for unknown device at address:`, address)
            return;
        }
        
        device.name = name;
        this.store.saveDevice(device);
        (this as EventEmitter<ConsumerEvents>).emit('device_update', device);
        this.logger.debug(`Device ${key} renamed to: ${name}`);
    }
    setDevicePatch(address: DeviceAddress, patch: Array<GlobalTallySource>): void{
        const key = this.getDeviceKey(address);
        
        const device = this.devices.get(key);
        if (!device){
            this.logger.warn(`Attempted to set patch:`, patch, `for unknown device at address:`, address)
            return;
        }
        
        device.patch = patch;
        this.store.saveDevice(device);
        this.setTallyDevice(device);
        (this as EventEmitter<ConsumerEvents>).emit('device_update', device);
        this.logger.debug(`Device ${key} set patch to:`, patch);
    }
    deleteDevice(address: DeviceAddress): void {
        const key = this.getDeviceKey(address);

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

    abstract setDeviceAlert(address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget, time: number): void;
    
    protected setTallyDevice(device: TallyDevice): void {

        let newState = this.baseState; // Default: NONE, or configured state-on-disconnect

        for (const patch of device.patch) {

            const parsedSource = GlobalSourceTools.create(patch.producer, patch.source);

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
            this.logger.debug(`Device ${this.getDeviceKey(device.id)} state changed to ${DeviceTallyState[device.state]}`);
            (this as EventEmitter<ConsumerEvents>).emit('device_update', device);
            this.sendTallyDevice(device);
        }
    }

    protected abstract sendTallyDevice(device: TallyDevice): void;

    consumeTally(state: TallyState): void {
        this.tallyState = state;

        this.logger.debug('Consumed TallyState:', GlobalSourceTools.serialize(state));

        for (const device of this.devices.values()) {
            this.setTallyDevice(device);
        }
    }

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