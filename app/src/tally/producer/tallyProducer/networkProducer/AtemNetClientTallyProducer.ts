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

  protected getDefaultConfig(): Omit<NetClientProducerConfig, "id" | "host"> {
    return AtemNetClientTallyProducer.DefaultConfig;
  }

  private atem: Atem;
  private atemState: AtemState | null = null;

  constructor(config: WithRequired<NetClientProducerConfig, "id" | "host">) {
    super(config);

    this.atem = new Atem({
      address: this.config.host,
      port: this.config.port,
    });

    this.atem.on("info", (data) => {
      this.logger.debug("Info:", data);
    });
    this.atem.on("error", (data) => {
      this.logger.error(
        "Error:",
        data,
        `target=${this.config.host}:${this.config.port}`,
      );
    });

    this.atem.on("connected", () => {
      this.info.state = ConnectionState.ONLINE;
      this.atemState = this.atem.state ?? null;
      this.info.model = this._parseModel();
      this.info.sources = this._parseSources();

      this.logger.info("Connected to model:", this.getModel());
      this.emitInfoUpdate();
      this._parseTallystate();
    });

    this.atem.on("disconnected", () => {
      this.info.state = ConnectionState.OFFLINE;
      this.atemState = null;

      this.logger.warn(
        "Disconnected",
        `target=${this.config.host}:${this.config.port}`,
      );
      this.emitInfoUpdate();
      this._parseTallystate();
    });

    // TODO. p.includes is changed to p.startsWith. Check if valid.
    this.atem.on("stateChanged", (state, pathToChange) => {
      this.atemState = state;
      let infoChange: boolean = false;

      this.logger.debug("State Changed. Path:", pathToChange);

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
      if (newModel.long !== this.info.model.long || newModel.short !== this.info.model.short) {
        this.info.model = newModel;
        infoChange = true;
        this.logger.info(`Updated model:`, this.info.model);
      }

      if (this.info.sources.size === 0 || pathToChange.some((p) => p.startsWith("inputs"))) {
        this.info.sources = this._parseSources();
        infoChange = true;
        this.logger.info(`Updated sources:`, this.info.sources);
      }

      if (infoChange) this.emitInfoUpdate();
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
    return this.atem.connect(this.config.host);
  }
  disconnect(): Promise<void> {
    return this.atem.disconnect();
  }

  protected _parseModel(): DisplayName {
    if (!this.atemState || this.info.state !== ConnectionState.ONLINE) {
      return this.info.model;
    }
    return {
      long: this.atemState.info.productIdentifier || "Unknown ATEM Model",
      short: AtemEnums.Model[this.atemState.info.model],
    };
  }

  protected _parseSources(): SourceMap {
    const sources: SourceMap = new Map();

    if (this.info.state !== ConnectionState.ONLINE || !this.atemState) {
      return sources;
    }

    for (const [id, input] of Object.entries(this.atemState.inputs)) {
      if (!input) continue;

      const globalAddress = { producer: this.config.id, source: id };
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

  // TODO: Rewrite Below
  protected _parseTallystate(): void {
    if (this.info.state === ConnectionState.ONLINE) {
      try {
        rawProgram = this.atem.listVisibleInputs("program");
        rawPreview = this.atem.listVisibleInputs("preview");
      } catch (e) {
        this.logger.error(`Failed to parse tally state:`, e); // TODO Check if this happens often and there should better be some timeout.
      }
    }

    // TODO Implement multi ME, and maybe even aux handling?
    const newProgramStrings = rawProgram.map((id) =>
      GlobalSourceTools.create(this.config.id, String(id)),
    );
    const newPreviewStrings = rawPreview.map((id) =>
      GlobalSourceTools.create(this.config.id, String(id)),
    );

    const newTallyState: TallyState = {
      moment: this.tallyState.moment,
      program: new Set<string>(newProgramStrings),
      preview: new Set<string>(newPreviewStrings),
    };

    if (
      !GlobalSourceTools.areTallyStatesEqual(this.tallyState, newTallyState)
    ) {
      this.tallyState = newTallyState;

      this.emit("tally_update", this.tallyState);

      this.logger.debug(
        "Tally Change:",
        GlobalSourceTools.serialize(this.tallyState),
      );
    }
  }
}
