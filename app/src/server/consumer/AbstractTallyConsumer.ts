import { EventEmitter } from "node:events";
import { TallyState } from "../types/TallyState";


export interface ConsumerConfig {
    name?: string;
    parent?: string;
}

export interface TallyConsumerEvents {
    [key: string]: any[];
}

export abstract class AbstractTallyConsumer<T extends TallyConsumerEvents = TallyConsumerEvents> extends EventEmitter<T> {
    
    protected readonly conType: string = "CONSUMER";

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
        
        this.checkConfig(this.config);
    }

    protected tallyState: TallyState = {
        alert: [],
        program: [],
        preview: []
    };
        
    protected checkConfig(config: ConsumerConfig) {}
    
    consumeTally(state: TallyState): void {
        this.tallyState = state;
    }

    abstract init(): void | Promise<void>;

    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name;
    }

    protected devLog(...data: any[]) {
        console.log(`[${this.config.parent}::${this.conType}::${this.config.name}]`, ...data);
    }
}