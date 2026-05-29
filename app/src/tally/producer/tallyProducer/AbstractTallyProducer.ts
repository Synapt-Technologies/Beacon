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
import {
  type SourceMap,
  BusTools,
  type BusGroupStateMap,
  type BusGroupInfoMap,
} from "../../types/SourceTypes";

// export enum ProducerType { // Move to AbstractProducer once imp, or probably remove.
//     UNKNOWN = "UNKNWN",
//     SWITCHER = "SWTCHR",
//     AUX = "AUXILI",
//     WEBPAGE = "WEBPAG"
// }

export type TallyProducerEvents = {
  info_update: [ProducerInfo];
  tally_update: [BusGroupStateMap];
};

// TODO: Add an AbstractProducer that can be extended by an AbstractAlertProducer
export abstract class AbstractTallyProducer<
  T extends TallyProducerEvents & Record<string, unknown[]> =
    TallyProducerEvents,
> extends EventEmitter<T> {
  // TODO: In AbstractConnection make some sort of array to support flexible lable count.
  public readonly conType: string = "PROD";
  public readonly prodType: string = "SWTCHR";

  protected _logger: Logger;

  protected _store: ProducerStore;

  protected _config: ProducerConfig;
  protected abstract _getDefaultConfig(): Omit<ProducerConfig, "id">;

  protected _info: ProducerInfo = {
    state: ConnectionState.OFFLINE,
    model: {
      long: "Unknown Model",
      short: "UNKNOWN",
    },
    sources: new Map(),
    busGroups: new Map(),
  };

  getConfig(): ProducerConfig {
    return this._config;
  }
  getId(): ProducerId {
    return this._config.id;
  }
  setName(name: string): void {
    this._config.name = name;
  }
  getName(): string {
    return this._config.name;
  }

  getInfo(): ProducerInfo {
    return this._info;
  }

  constructor(config: WithRequired<ProducerConfig, "id">) {
    super();

    this._config = { ...this._getDefaultConfig(), ...config };

    this._logger = new Logger([
      "Tally",
      this.conType,
      this.prodType,
      this._config.id,
    ]);

    this._checkConfig(this._config);

    //? Not in AbstractConnection (Maybe store should)
    this._store = new ProducerStore(this._config.id);

    const storedInfo = this._store.loadInfo();
    if (storedInfo) {
      this._info = storedInfo;
      this._logger.debug(`Loaded stored info.`);
    }
    //? End Not in AbstractConnection
  }

  protected _checkConfig(config: ProducerConfig) {
    if (!config.id || config.id == "")
      this._logger.fatal(`Invalid ID provided. Submitted config:`, config);
    if (config.name == null || config.name == "")
      this._logger.fatal(`Name was not provided. Submitted config:`, config);
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
  protected _emitInfoUpdate(): void {
    if (this._destroying) return;
    this._store.saveInfo(this._info);
    (this as EventEmitter<TallyProducerEvents>).emit("info_update", this._info);
    this._logger.debug(`Info updated.`);
  }

  protected _busState: BusGroupStateMap = new Map();

  protected _emitTallyUpdate(): void {
    if (this._destroying) return;
    (this as EventEmitter<TallyProducerEvents>).emit(
      "tally_update",
      this._busState,
    );
  }

  protected _setBusState(busState: BusGroupStateMap): void {
    if (BusTools.areGroupStateMapEqual(busState, this._busState)) return;

    this._busState = busState;
    this._emitTallyUpdate();

    const newBusInfo = BusTools.groupInfoMapFromStateMap(busState);
    if (!BusTools.areGroupInfoMapEqual(newBusInfo, this._info.busGroups)) {
      this._info.busGroups = newBusInfo;
      this._emitInfoUpdate();
    }
  }

  getBusState(): BusGroupStateMap {
    return this._busState;
  }

  getSources(): SourceMap {
    return this._info.sources;
  }

  getBusInfo(): BusGroupInfoMap {
    return this._info.busGroups;
  }

  getModel(): DisplayName {
    return this._info.model;
  }
}
