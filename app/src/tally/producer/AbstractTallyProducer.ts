import { EventEmitter } from "node:events";
import type { SourceInfo, ProducerId, TallyState, SourceMap } from "../types/ProducerStates";
import { Logger } from "../../logging/Logger";

export interface ProducerConfig {
    id: ProducerId,
    name?: string;
    parent?: string;
}

export interface ProducerTallyState extends TallyState {
    update_moment: number | null;
}

// export enum ProducerType { // Move to AbstractProducer once imp, or probably remove.
//     UNKNOWN = "UNKNWN",
//     SWITCHER = "SWTCHR",
//     AUX = "AUXILI",
//     WEBPAGE = "WEBPAG"
// }
export interface ProducerInfo {
    update_moment: number | null;
    model: string;
    sources: SourceMap;
    // Todo add multi bus support.
}

export interface TallyProducerEvents {
    tally_update: [ProducerTallyState];
    info_update: [ProducerInfo, path: string[] | null];
    [key: string]: any[];
}

// TODO: Add an AbstractProducer that can be extended by an AbstractAlertProducer
export abstract class AbstractTallyProducer<T extends TallyProducerEvents = TallyProducerEvents> extends EventEmitter<T> {

    public readonly conType: string = "PROD";
    public readonly prodType: string = "SWTCHR";

    protected logger: Logger;

    protected config: Required<ProducerConfig>;

    // Static + function: Static removes recursion, function makes it so the parent constructor gets the child's values.
    public static readonly DefaultConfig: Required<ProducerConfig> = { 
        id: "",
        name: "Producer", // Todo make empty and deny empty values?
        parent: "??",
    };

    protected abstract getDefaultConfig(): Required<ProducerConfig>;
    
    constructor(config: ProducerConfig) {
        super();

        this.config = {...this.getDefaultConfig(), ...config};

        this.logger = new Logger([
            this.config.parent,
            this.conType,
            this.prodType,
            this.config.name
        ]);
        
        this.checkConfig(this.config);
    }

    protected checkConfig(config: ProducerConfig) {
        if (!config.id || config.id == "")
            this.logger.fatal(`Invalid producer ID provided. Submitted config:`, config);
    }

    abstract init(): void | Promise<void>;
    
    protected info: ProducerInfo = {
        update_moment: null,
        model: "UNKNOWN",
        sources: new Map(),
    };

    protected tallyState: ProducerTallyState = {
        update_moment: null, // TODO: Add check for last updated? Too long ago -> Wrong? -> Update moment even if no change.
        program: new Set<string>(),
        preview: new Set<string>(),
    };

    getTallyState(): ProducerTallyState {
        return this.tallyState;
    }

    getInfo(): ProducerInfo {
        return this.info;
    }

    getId(): ProducerId {
        return this.config.id;
    }

    getSources(): SourceMap | null {
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
}
