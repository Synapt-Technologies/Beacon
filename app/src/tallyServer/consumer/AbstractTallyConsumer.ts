import { EventEmitter } from "node:events";
import { GlobalTallySource, TallyState } from "../types/TallyState";
import { Logger } from "../../logging/Logger";
import { DeviceAddress, DeviceAlertState, DeviceAlertTarget, TallyDevice } from "../types/DeviceState";


export interface ConsumerConfig {
    name?: string;
    parent?: string;
}

export interface TallyConsumerEvents {
    [key: string]: any[];
}

export abstract class AbstractTallyConsumer<T extends TallyConsumerEvents = TallyConsumerEvents> extends EventEmitter<T> {
    
    protected readonly conType: string = "CONS";

    protected logger: Logger;

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

    abstract getAvailableDevices(): Map<DeviceAddress, TallyDevice>;
    abstract getDevice(address: DeviceAddress): TallyDevice | null;
    abstract setDeviceName(address: DeviceAddress, name: string): void;
    abstract setDevicePatch(address: DeviceAddress, patch: Array<GlobalTallySource>): void;
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