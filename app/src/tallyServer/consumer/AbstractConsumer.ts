import { EventEmitter } from "node:events";
import { GlobalSourceTools, type GlobalTallySource, type TallyState } from "../types/TallyState";
import { Logger } from "../../logging/Logger";
import { type DeviceAddress, DeviceAlertState, DeviceAlertTarget, DeviceTallyState, type TallyDevice } from "../types/DeviceState";


export interface ConsumerConfig {
    name?: string;
    parent?: string;
}

export interface ConsumerEvents {
    device_update: [device: TallyDevice];
    [key: string]: any[];
}

export abstract class AbstractConsumer<T extends ConsumerEvents = ConsumerEvents> extends EventEmitter<T> {
    
    protected readonly conType: string = "CONS";

    protected logger: Logger;

    protected devices: Map<string, TallyDevice> = new Map();

    protected config: Required<ConsumerConfig>;

    // Static + function: Static removes recursion, function makes it so the parent constructor gets the child's values.
    public static readonly DefaultConfig: Required<ConsumerConfig> = { 
        name: "Consumer",
        parent: "??",
    };

    protected abstract getDefaultConfig(): Required<ConsumerConfig>;

    constructor(config: ConsumerConfig) {
        super();

        this.config = {...this.getDefaultConfig(), ...config};

        this.logger = new Logger([
            this.config.parent,
            this.conType,
            this.config.name
        ]);
        
        this.checkConfig(this.config);
    }

    protected tallyState: TallyState = {
        program: new Set<string>(),
        preview: new Set<string>()
    };
        
    protected checkConfig(config: ConsumerConfig) {}

    protected getDeviceKey(address: DeviceAddress): string {
        return `${address.parent}:${address.device}`;
    }

    protected getDeviceAddress(key: string): DeviceAddress {
        
        const parts = key.split(":");
        const parent = parts.shift() || ""; // Take the first part
        const device = parts.join(":");    // Put everything else back together
        return { parent, device };
    }

    getAvailableDevices(): Array<TallyDevice> {
        return Array.from(this.devices.values());
    }
    getDevice(address: DeviceAddress): TallyDevice | null {
        return this.devices.get(this.getDeviceKey(address)) || null;
    }
    setDeviceName(address: DeviceAddress, name: string): void {
        const key = this.getDeviceKey(address);
        
        const device = this.devices.get(key);
        if (!device){
            this.logger.warn(`Attempted to set name:`, name, `for unknown device at address:`, address)
            return;
        }
        
        device.name = name;
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
        this.processTallyDevice(device);
        (this as EventEmitter<ConsumerEvents>).emit('device_update', device);
        this.logger.debug(`Device ${key} set patch to:`, patch);
    }
    abstract setDeviceAlert(address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget): void; 
    

    protected processTallyDevice(device: TallyDevice): void {
        this.setTallyDevice(device);
        this.sendTallyDevice(device);
    }

    protected setTallyDevice(device: TallyDevice): void {

        let newState = DeviceTallyState.NONE; // Default state

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

        if (device.state !== newState) {
            this.logger.debug(`Device ${this.getDeviceKey(device.id)} state changed from ${DeviceTallyState[device.state]} to ${DeviceTallyState[newState]}`);
            (this as EventEmitter<ConsumerEvents>).emit('device_update', device);
            device.state = newState;
        }
    }

    protected abstract sendTallyDevice(device: TallyDevice): void;

    consumeTally(state: TallyState): void {
        this.tallyState = state;

        for (const device of this.devices.values()) {
            this.setTallyDevice(device);
        }
    }

    abstract init(): void | Promise<void>;

    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name;
    }
}