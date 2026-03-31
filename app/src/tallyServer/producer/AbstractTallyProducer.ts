import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";
import { SourceInfo } from "../types/SourceInfo";

export interface ProducerConfig {
    name?: string;
    parent?: string;
}

export interface ProducerTallyState extends TallyState {
    update_moment: number | null;
}

export enum ProducerType {
    UNKNOWN = "UNKNWN",
    SWITCHER = "SWTCHR",
    AUX = "AUXILI",
    WEBPAGE = "WEBPAG"
}
export interface ProducerInfo {
    update_moment: number | null;
    model: string;
    sources: Map<number, SourceInfo> | null
}

export interface TallyProducerEvents {
    tally_update: [ProducerTallyState];
    info_update: [ProducerInfo, path: string[] | null];
    [key: string]: any[];
}

// TODO: Add the option for camera id prefix, to differentiate between producers
export abstract class AbstractTallyProducer<T extends TallyProducerEvents = TallyProducerEvents> extends EventEmitter<T> {

    public      readonly conType: string = "PROD";
    protected   readonly producerType: ProducerType = ProducerType.UNKNOWN;

    protected config: Required<ProducerConfig>;

    // Static + function: Static removes recursion, function makes it so the parent constructor gets the child's values.
    public static readonly DefaultConfig: Required<ProducerConfig> = { 
        name: "Producer", // Todo make empty and deny empty values?
        parent: "??",
    };

    protected abstract getDefaultConfig(): Required<ProducerConfig>;
    
    constructor(config: ProducerConfig) {
        super();

        this.config = {...this.getDefaultConfig(), ...config};
        
        this.checkConfig(this.config);
    }

    protected checkConfig(config: ProducerConfig) {}

    abstract init(): void | Promise<void>;
    
    protected info: ProducerInfo = {
        update_moment: null,
        model: "UNKNOWN",
        sources: null
    };

    protected tallyState: ProducerTallyState = {
        update_moment: null, // TODO: Add check for last updated? Too long ago -> Wrong? -> Update moment even if no change.
        program: [],
        preview: [],
        alert: [],
    };

    getTallyState(): ProducerTallyState {
        return this.tallyState;
    }

    getInfo(): ProducerInfo {
        return this.info;
    }

    getSources(): Map<number, SourceInfo> | null {
        return this.info.sources;
    }

    getModel(): string {
        return this.info.model;
    }

    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name;
    }

    protected devLog(...data: any[]) {
        console.log(`[${this.config.parent}::${this.conType}::${this.producerType}::${this.config.name}]`, ...data);
    }
}
