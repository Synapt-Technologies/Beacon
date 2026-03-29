import { EventEmitter } from "node:events";
import { TallyState } from "../types/TallyState";


export interface ConsumerConfig {
    name?: string;
    parent?: string;
} 

export interface LightAlertState { // Todo: Move to TallyState File?
    number: number;
    type: "operator" | "talent";
}

export interface LightState extends TallyState { //TODO: Rename
    alert: Array<LightAlertState>;
}

export interface TallyConsumerEvents {
    [key: string]: any[];
}

export abstract class AbstractTallyConsumer<T extends TallyConsumerEvents = TallyConsumerEvents> extends EventEmitter<T> {
    
    protected readonly conType: string = "CNSMR"

    protected static readonly DefaultConfig: Required<ConsumerConfig> = {
        name: "Consumer",
        parent: "??",
    }
    protected config: Required<ConsumerConfig>;

    constructor(config: ConsumerConfig) {
        super();

        this.config = {...AbstractTallyConsumer.DefaultConfig, ...config};
        
        this.checkConfig(config);
    }

    protected lightState: LightState = {
        alert: [],
        program: [],
        preview: []
    };
        
    protected checkConfig(config: ConsumerConfig) {}
    
    consumeTally(state: LightState): void {
        this.lightState = state;
    }

    abstract init(): void;

    abstract setName(name: string): void;
    abstract getName(): string;

    protected devLog(...data: any[]) {
        console.log(...['['+(this.config.parent ??= '??')+'::'+this.conType+'::'+(this.config.name)+'] ', ...data]);
    }
}