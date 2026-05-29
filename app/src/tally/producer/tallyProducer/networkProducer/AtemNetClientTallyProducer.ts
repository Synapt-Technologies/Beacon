import { Atem, type AtemState } from "atem-connection";
import { Enums as AtemEnums } from "atem-connection";
import {
  AbstractNetClientTallyProducer,
  type NetClientProducerConfig,
} from "./AbstractNetClientTallyProducer";
import {
  ConnectionState,
  type DisplayName,
  type WithRequired,
} from "../../../types/CommonTypes";
import {
  SourceTools,
  BusTools,
  type SourceInfo,
  type SourceMap,
  type BusStateMap,
  type SourceBusInfo,
  type GlobalSourceKey,
} from "../../../types/SourceTypes";

// TODO: Any atem specific config?
export class AtemNetClientTallyProducer extends AbstractNetClientTallyProducer {
  public static readonly DefaultConfig: Omit<
    NetClientProducerConfig,
    "id" | "host"
  > = {
    name: "Atem",
    port: 9910,
  };

  protected _getDefaultConfig(): Omit<NetClientProducerConfig, "id" | "host"> {
    return AtemNetClientTallyProducer.DefaultConfig;
  }

  private atem: Atem;
  private atemState: AtemState | null = null;

  constructor(config: WithRequired<NetClientProducerConfig, "id" | "host">) {
    super(config);

    this.atem = new Atem({
      address: this._config.host,
      port: this._config.port,
    });

    this.atem.on("info", (data) => {
      this._logger.debug("Info:", data);
    });
    this.atem.on("error", (data) => {
      this._logger.error(
        "Error:",
        data,
        `target=${this._config.host}:${this._config.port}`,
      );
    });

    this.atem.on("connected", () => {
      this._info.state = ConnectionState.ONLINE;
      this.atemState = this.atem.state ?? null;
      this._info.model = this._parseModel();
      this._info.sources = this._parseSources();

      this._logger.info("Connected to model:", this.getModel());
      this._emitInfoUpdate();
      this._parseTallystate();
    });

    this.atem.on("disconnected", () => {
      this._info.state = ConnectionState.OFFLINE;
      this.atemState = null;

      this._logger.warn(
        "Disconnected",
        `target=${this._config.host}:${this._config.port}`,
      );
      this._emitInfoUpdate();
      this._parseTallystate();
    });

    // TODO. p.includes is changed to p.startsWith. Check if valid.
    this.atem.on("stateChanged", (state, pathToChange) => {
      this.atemState = state;
      let infoChange: boolean = false;

      this._logger.debug("State Changed. Path:", pathToChange);

      if (
        pathToChange.some(
          (p) =>
            p.startsWith("video.mixEffects") ||
            p.startsWith("video.downstreamKeyers") ||
            p.startsWith("video.auxilliaries"),
        )
      ) {
        this._parseTallystate();
      }

      const newModel = this._parseModel();
      if (
        newModel.long !== this._info.model.long ||
        newModel.short !== this._info.model.short
      ) {
        this._info.model = newModel;
        infoChange = true;
        this._logger.info(`Updated model:`, this._info.model);
      }

      if (
        this._info.sources.size === 0 ||
        pathToChange.some((p) => p.startsWith("inputs"))
      ) {
        this._info.sources = this._parseSources();
        infoChange = true;
        this._logger.info(`Updated sources:`, this._info.sources);
      }

      if (infoChange) this._emitInfoUpdate();
    });
  }

  async init(): Promise<void> {
    await this.connect();
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    await this.atem.destroy();
  }

  connect(): Promise<void> {
    return this.atem.connect(this._config.host);
  }
  disconnect(): Promise<void> {
    return this.atem.disconnect();
  }

  protected _parseModel(): DisplayName {
    if (!this.atemState || this._info.state !== ConnectionState.ONLINE) {
      return this._info.model;
    }
    return {
      long: this.atemState.info.productIdentifier || "Unknown ATEM Model",
      short: AtemEnums.Model[this.atemState.info.model],
    };
  }

  protected _parseSources(): SourceMap {
    const sources: SourceMap = new Map();

    if (this._info.state !== ConnectionState.ONLINE || !this.atemState) {
      return sources;
    }

    for (const [id, input] of Object.entries(this.atemState.inputs)) {
      if (!input) continue;

      const globalAddress = { producer: this._config.id, source: id };
      const globalKey = SourceTools.fromAddress(globalAddress);

      const sourceInfo: SourceInfo = {
        id: globalAddress,
        name: {
          short: input.shortName || `${id}`,
          long: input.longName || `Input ${id}`,
        },
      };

      sources.set(globalKey, sourceInfo);
    }

    return sources;
  }

  protected _parseTallystate(): void {
    const newBusMap: BusStateMap = new Map();
    const id = this._config.id;

    if (this.atemState && this._info.state === ConnectionState.ONLINE) {
      this.atemState.video.mixEffects.forEach((me, i) => {
        if (!me) return;

        const meGroup = `ME${i + 1}`;
        const meLabel = `ME-${i + 1}`;

        let pgmInputs: number[] = [];
        let prevInputs: number[] = [];
        try {
          pgmInputs = this.atem.listVisibleInputs("program", i);
          prevInputs = this.atem.listVisibleInputs("preview", i);
        } catch (e) {
          this._logger.error(`Failed to list visible inputs for ${meLabel}:`, e);
        }

        const pgmKey = BusTools.fromGroupedParts(id, meGroup, "PRGM");
        const pgmInfo: SourceBusInfo = {
          id: pgmKey,
          name: { long: `${meLabel} Program`, short: `${meLabel} PGM` },
          index: 0,
        };
        newBusMap.set(
          pgmKey,
          BusTools.stateFromInfo(pgmInfo, new Set(pgmInputs.map(src => SourceTools.fromParts(id, String(src))))),
        );

        const prevKey = BusTools.fromGroupedParts(id, meGroup, "PRVW");
        const prevInfo: SourceBusInfo = {
          id: prevKey,
          name: { long: `${meLabel} Preview`, short: `${meLabel} PRVW` },
          index: 0,
        };
        newBusMap.set(
          prevKey,
          BusTools.stateFromInfo(prevInfo, new Set(prevInputs.map(src => SourceTools.fromParts(id, String(src))))),
        );
      });

      this.atemState.video.auxilliaries?.forEach((auxInput, i) => {
        if (auxInput == null) return;

        const auxKey = BusTools.fromGroupedParts(id, "AUX", String(i));
        const auxInfo: SourceBusInfo = {
          id: auxKey,
          name: { long: `AUX ${i + 1}`, short: `AUX-${i + 1}` },
          index: 1,
        };
        newBusMap.set(
          auxKey,
          BusTools.stateFromInfo(auxInfo, new Set([SourceTools.fromParts(id, String(auxInput))])),
        );
      });

      this.atemState.video.downstreamKeyers?.forEach((dsk, i) => {
        if (!dsk) return;

        const dskKey = BusTools.fromGroupedParts(id, "DSK", String(i));
        const dskInfo: SourceBusInfo = {
          id: dskKey,
          name: { long: `DSK${i + 1}`, short: `DSK-${i + 1}` },
          index: 2,
        };
        const sources: Set<GlobalSourceKey> = dsk.onAir && dsk.sources
          ? new Set([
              SourceTools.fromParts(id, String(dsk.sources.fillSource)),
              SourceTools.fromParts(id, String(dsk.sources.cutSource)),
            ])
          : new Set();
        newBusMap.set(dskKey, BusTools.stateFromInfo(dskInfo, sources));
      });
    }

    this._setBusState(newBusMap);
  }
}
