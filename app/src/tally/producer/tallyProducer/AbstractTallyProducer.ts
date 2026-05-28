import { EventEmitter } from "node:events";
import { Logger } from "../../../logging/Logger";
import { ProducerStore } from "../../../database/ProducerStore";
import type { ProducerConfig, ProducerId, ProducerInfo } from "../../types/ProducerTypes";
import type { TallyState } from "../../../../src-old/tally/types/ProducerStates";
import type { ConsumerConfig } from "../../types/ConsumerTypes";
import { ConnectionState, type DisplayName, type WithRequired } from "../../types/CommonTypes";
import type { ProducerBusMap, SourceMap } from "../../types/SourceTypes";




// export enum ProducerType { // Move to AbstractProducer once imp, or probably remove.
//     UNKNOWN = "UNKNWN",
//     SWITCHER = "SWTCHR",
//     AUX = "AUXILI",
//     WEBPAGE = "WEBPAG"
// }


export type TallyProducerEvents = {
    tally_update: [TallyState];
    info_update: [ProducerInfo];
}

// TODO: Add an AbstractProducer that can be extended by an AbstractAlertProducer
export abstract class AbstractTallyProducer<T extends TallyProducerEvents & Record<string, unknown[]> =TallyProducerEvents> extends EventEmitter<T> {

    public readonly conType: string = "PROD";
    public readonly prodType: string = "SWTCHR";

    protected logger: Logger;

    protected store: ProducerStore;

    protected config: ProducerConfig;
    protected abstract getDefaultConfig(): Omit<ProducerConfig, 'id'>;

    protected busState: ProducerBusMap = new Map();

    protected info: ProducerInfo = { // TODO make partial?
        state: ConnectionState.OFFLINE,
        model: {
            long: "Unknown Model",
            short: "UNKNOWN"
        },
        sources: new Map(),
    };


    getConfig(): ProducerConfig {
        return this.config;
    }

    getInfo(): ProducerInfo {
        return this.info;
    }

    getBusState(): ProducerBusMap {
        return this.busState;
    }

    constructor(config: WithRequired<ConsumerConfig, "id">) {
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
            this.logger.fatal(`Invalid consumer ID provided. Submitted config:`, config);
        if (config.name == null || config.name == "")
            this.logger.fatal(`System name was not provided. Submitted config:`, config);
    }

    abstract init(): void | Promise<void>;
    abstract destroy(): void | Promise<void>;


    private _destroying = false;
    markDestroying(): void {
        this._destroying = true;
    }
    isDestroying(): boolean {
        return this._destroying;
    }


    protected emitInfoUpdate(): void {
        if (this._destroying) return;
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

    getModel(): DisplayName {
        return this.info.model;
    }

    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name;
    }
}
