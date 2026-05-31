import { Atem, type AtemState } from "atem-connection";
import { Enums as AtemEnums } from "atem-connection";
import {
  AbstractNetClientTallyProducer,
  type NetClientProducerConfig,
} from "./AbstractNetClientTallyProducer";
import {
  ConnectionState,
  TallyState,
  type DisplayName,
  type WithRequired,
} from "../../../types/CommonTypes";
import {
  SourceTools,
  BusTools,
  type SourceInfo,
  type SourceMap,
  type BusGroupStateMap,
  type BusStateMap,
  type SourceBusGroup,
  type SourceBusInfo,
  type SourceSet,
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

  async _destroy(): Promise<void> {
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
    if (!this.atemState || this._info.state !== ConnectionState.ONLINE) {
      this._setBusState(new Map());
      return;
    }

    const id = this._config.id;
    const newGroupMap: BusGroupStateMap = new Map();
    let nextGroupIndex = 0;

    this.atemState.video.mixEffects.forEach((me, i) => {
      if (!me) return;

      let pgmInputs: number[] = [];
      let prvInputs: number[] = [];
      try {
        pgmInputs = this.atem.listVisibleInputs("program", i);
        prvInputs = this.atem.listVisibleInputs("preview", i);
      } catch (e) {
        this._logger.error(`Failed to list visible inputs for ME${i + 1}:`, e);
      }

      const groupId = `ME${i}`;
      const meLabel = `ME-${i + 1}`;
      const busses: BusStateMap = new Map();

      const pgmInfo: SourceBusInfo = {
        id: { producer: id, group: groupId, bus: "PGM" },
        name: { long: `${meLabel} Program`, short: `${meLabel} PGM` },
        index: 0,
        defaultLogic:
          i === 0
            ? { enabled: true, state: TallyState.PROGRAM }
            : { enabled: false, state: TallyState.PROGRAM },
      };
      busses.set(
        BusTools.busFromParts(id, groupId, "PGM"),
        BusTools.busStateFromInfo(
          pgmInfo,
          new Set(
            pgmInputs.map((src) => SourceTools.fromParts(id, String(src))),
          ),
        ),
      );

      const prvInfo: SourceBusInfo = {
        id: { producer: id, group: groupId, bus: "PRV" },
        name: { long: `${meLabel} Preview`, short: `${meLabel} PRV` },
        index: 1,
        defaultLogic:
          i === 0
            ? { enabled: true, state: TallyState.PREVIEW }
            : { enabled: false, state: TallyState.PREVIEW },
      };
      busses.set(
        BusTools.busFromParts(id, groupId, "PRV"),
        BusTools.busStateFromInfo(
          prvInfo,
          new Set(
            prvInputs.map((src) => SourceTools.fromParts(id, String(src))),
          ),
        ),
      );

      const meGroup: SourceBusGroup = {
        id: { producer: id, group: groupId },
        name: { long: `Mix Effect ${i + 1}`, short: meLabel },
        index: i,
      };
      newGroupMap.set(
        BusTools.groupFromParts(id, groupId),
        BusTools.groupStateFromGroup(meGroup, busses),
      );
      nextGroupIndex = i + 1;
    });

    const auxBusses: BusStateMap = new Map();
    this.atemState.video.auxilliaries?.forEach((auxInput, i) => {
      if (auxInput == null) return;
      const auxInfo: SourceBusInfo = {
        id: { producer: id, group: "AUX", bus: String(i) },
        name: { long: `AUX ${i + 1}`, short: `AUX ${i + 1}` },
        index: i,
      };
      auxBusses.set(
        BusTools.busFromParts(id, "AUX", String(i)),
        BusTools.busStateFromInfo(
          auxInfo,
          new Set([SourceTools.fromParts(id, String(auxInput))]),
        ),
      );
    });
    if (auxBusses.size > 0) {
      const auxGroup: SourceBusGroup = {
        id: { producer: id, group: "AUX" },
        name: { long: "Auxiliaries", short: "AUX" },
        index: nextGroupIndex++,
      };
      newGroupMap.set(
        BusTools.groupFromParts(id, "AUX"),
        BusTools.groupStateFromGroup(auxGroup, auxBusses),
      );
    }

    // TODO: Check if this is needed, as DSK sources also appear in ME busses.
    const dskBusses: BusStateMap = new Map();
    this.atemState.video.downstreamKeyers?.forEach((dsk, i) => {
      if (!dsk) return;
      const sources: SourceSet =
        dsk.onAir && dsk.sources
          ? new Set([
              SourceTools.fromParts(id, String(dsk.sources.fillSource)),
              SourceTools.fromParts(id, String(dsk.sources.cutSource)),
            ])
          : new Set();
      const dskInfo: SourceBusInfo = {
        id: { producer: id, group: "DSK", bus: String(i) },
        name: { long: `Downstream Keyer ${i + 1}`, short: `DSK ${i + 1}` },
        index: i,
      };
      dskBusses.set(
        BusTools.busFromParts(id, "DSK", String(i)),
        BusTools.busStateFromInfo(dskInfo, sources),
      );
    });
    if (dskBusses.size > 0) {
      const dskGroup: SourceBusGroup = {
        id: { producer: id, group: "DSK" },
        name: { long: "Downstream Keyers", short: "DSK" },
        index: nextGroupIndex,
      };
      newGroupMap.set(
        BusTools.groupFromParts(id, "DSK"),
        BusTools.groupStateFromGroup(dskGroup, dskBusses),
      );
    }

    this._setBusState(newGroupMap);
  }
}
