import { EventEmitter } from "node:events";
import { GlobalTallySource, TallyState } from "../types/TallyState";
import { Logger } from "../../logging/Logger";
import { DeviceAddress, DeviceAlertState, DeviceAlertTarget, TallyDevice } from "../types/DeviceState";


export interface ConsumerConfig {
    name?: string;
    parent?: string;
}

export interface ConsumerEvents {
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
        program: [],
        preview: []
    };
        
    protected checkConfig(config: ConsumerConfig) {}

    protected getDeviceKey(address: DeviceAddress): string {
        return `${address.parent}:${address.device}`;
    }

    getAvailableDevices(): Map<string, TallyDevice> {
        return this.devices;
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
        this.logger.debug(`Device ${key} set patch to:`, patch);
    }
    abstract setDeviceAlert(address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget): void; 
    
    consumeTally(state: TallyState): void {
        this.tallyState = state;
        this.logger.debug("Consumed new tally state:", state);
    }

    abstract init(): void | Promise<void>;

    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name;
    }
}