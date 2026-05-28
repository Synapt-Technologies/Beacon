import { EventEmitter } from "node:events";
import { Logger } from "../../../logging/Logger";
import { ProducerStore } from "../../../database/ProducerStore";
import type {
  ProducerConfig,
  ProducerId,
  ProducerInfo,
} from "../../types/ProducerTypes";
import {
  ConnectionState,
  type DisplayName,
  type WithRequired,
} from "../../types/CommonTypes";
import type { ProducerBusMap, SourceMap } from "../../types/SourceTypes";

// export enum ProducerType { // Move to AbstractProducer once imp, or probably remove.
//     UNKNOWN = "UNKNWN",
//     SWITCHER = "SWTCHR",
//     AUX = "AUXILI",
//     WEBPAGE = "WEBPAG"
// }

export type TallyProducerEvents = {
  info_update: [ProducerInfo];
  tally_update: [ProducerBusMap];
};

// TODO: Add an AbstractProducer that can be extended by an AbstractAlertProducer
export abstract class AbstractTallyProducer<
  T extends TallyProducerEvents & Record<string, unknown[]> =
    TallyProducerEvents,
> extends EventEmitter<T> {
  // TODO: In AbstractConnection make some sort of array to support flexible lable count.
  public readonly conType: string = "PROD";
  public readonly prodType: string = "SWTCHR";

  protected logger: Logger;

  protected store: ProducerStore;

  protected config: ProducerConfig;
  protected abstract getDefaultConfig(): Omit<ProducerConfig, "id">;

  protected info: ProducerInfo = {
    state: ConnectionState.OFFLINE,
    model: {
      long: "Unknown Model",
      short: "UNKNOWN",
    },
    sources: new Map(),
  };

  getConfig(): ProducerConfig {
    return this.config;
  }
  getId(): ProducerId {
    return this.config.id;
  }
  setName(name: string): void {
    this.config.name = name;
  }
  getName(): string {
    return this.config.name;
  }

  getInfo(): ProducerInfo {
    return this.info;
  }

  constructor(config: WithRequired<ProducerConfig, "id">) {
    super();

    this.config = { ...this.getDefaultConfig(), ...config };

    this.logger = new Logger([
      "Tally",
      this.conType,
      this.prodType,
      this.config.id,
    ]);

    this.checkConfig(this.config);

    //? Not in AbstractConnection (Maybe store should)
    this.store = new ProducerStore(this.config.id);

    const storedInfo = this.store.loadInfo();
    if (storedInfo) {
      this.info = storedInfo;
      this.logger.debug(`Loaded stored info.`);
    }
    //? End Not in AbstractConnection
  }

  protected checkConfig(config: ProducerConfig) {
    if (!config.id || config.id == "")
      this.logger.fatal(`Invalid ID provided. Submitted config:`, config);
    if (config.name == null || config.name == "")
      this.logger.fatal(`Name was not provided. Submitted config:`, config);
  }

  private _destroying = false;
  markDestroying(): void {
    this._destroying = true;
  }
  isDestroying(): boolean {
    return this._destroying;
  }

  abstract init(): void | Promise<void>;
  abstract destroy(): void | Promise<void>;

  // TODO: Move above to AbstractConnection
  // TODO emitInfoUpdate also in AbstractConnection? Or as abstract?
  protected emitInfoUpdate(): void {
    if (this._destroying) return;
    this.store.saveInfo(this.info);
    (this as EventEmitter<TallyProducerEvents>).emit("info_update", this.info);
    this.logger.debug(`Persisted info to store.`);
  }

  protected busState: ProducerBusMap = new Map();

  protected emitTallyUpdate(): void {
    if (this._destroying) return;
    (this as EventEmitter<TallyProducerEvents>).emit(
      "tally_update",
      this.busState,
    );
  }

  getBusState(): ProducerBusMap {
    return this.busState;
  }

  getSources(): SourceMap | null {
    return this.info.sources;
  }

  getModel(): DisplayName {
    return this.info.model;
  }
}
