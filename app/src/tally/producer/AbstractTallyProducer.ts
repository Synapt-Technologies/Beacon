import { EventEmitter } from "node:events";
import type { ProducerId, TallyState, SourceMap, ProducerModel } from "../types/ProducerStates";
import { Logger } from "../../logging/Logger";
import { ProducerStore } from "../../database/ProducerStore";

export interface ProducerConfig {
    id: ProducerId,
    name?: string;
}

export enum ProducerStatus {
    DISABLED = "DISABLED",
    OFFLINE = "OFFLINE",
    ONLINE = "ONLINE",
    ERROR = "ERROR"
}

// export enum ProducerType { // Move to AbstractProducer once imp, or probably remove.
//     UNKNOWN = "UNKNWN",
//     SWITCHER = "SWTCHR",
//     AUX = "AUXILI",
//     WEBPAGE = "WEBPAG"
// }
export interface ProducerInfo {
    update_moment: number | null;
    model: ProducerModel;
    sources: SourceMap;
    status: ProducerStatus;
    // Todo add multi bus support.
}

export type TallyProducerEvents = {
    tally_update: [TallyState];
    info_update: [ProducerInfo];
}

// TODO: Add an AbstractProducer that can be extended by an AbstractAlertProducer
export abstract class AbstractTallyProducer<T extends TallyProducerEvents & Record<string, any[]> =TallyProducerEvents> extends EventEmitter<T> {

    public readonly conType: string = "PROD";
    public readonly prodType: string = "SWTCHR";

    protected logger: Logger;

    protected store: ProducerStore;

    protected config: Required<ProducerConfig>;

    // Static + function: Static removes recursion, function makes it so the parent constructor gets the child's values.
    public static readonly DefaultConfig: Required<ProducerConfig> = {
        id: "",
        name: "Producer",
    };

    protected abstract getDefaultConfig(): Required<ProducerConfig>;

    getConfig(): ProducerConfig {
        return this.config;
    }
    
    constructor(config: ProducerConfig) {
        super();

        this.config = {...this.getDefaultConfig(), ...config};

        this.logger = new Logger(["Tally", this.conType, this.prodType, this.config.id]);

        this.store = new ProducerStore(this.config.id);

        const storedInfo = this.store.loadInfo();
        if (storedInfo) {
            this.info = storedInfo;
            this.logger.debug(`Loaded stored info.`);
        }

        
        this.checkConfig(this.config);
    }

    protected checkConfig(config: ProducerConfig) {
        if (!config.id || config.id == "")
            this.logger.fatal(`Invalid producer ID provided. Submitted config:`, config);
    }

    abstract init(): void | Promise<void>;
    abstract destroy(): void | Promise<void>;
    
    protected info: ProducerInfo = { // TODO make partial?
        update_moment: null,
        model: {
            short: "UNKNOWN",
            long: "Unknown Model"
        },
        sources: new Map(),
        status: ProducerStatus.OFFLINE,
    };

    protected tallyState: TallyState = {
        moment: undefined, // TODO: Add check for last updated? Too long ago -> Wrong? -> Update moment even if no change.
        program: new Set<string>(),
        preview: new Set<string>(),
    };

    getTallyState(): TallyState {
        return this.tallyState;
    }

    getInfo(): ProducerInfo {
        return this.info;
    }

    protected emitInfoUpdate(): void {
        this.store.saveInfo(this.info);
        (this as EventEmitter<TallyProducerEvents>).emit('info_update', this.info);
        this.logger.debug(`Persisted info to store.`);
    }

    getId(): ProducerId {
        return this.config.id;
    }

    getSources(): SourceMap | null {
        return this.info.sources;
    }

    getModel(): ProducerModel {
        return this.info.model;
    }

    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name;
    }
}
