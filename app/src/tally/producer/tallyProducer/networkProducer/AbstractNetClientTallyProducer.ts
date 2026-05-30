import net from "node:net";
import type { ProducerConfig } from "../../../types/ProducerTypes";
import {
  AbstractTallyProducer,
  type TallyProducerEvents,
} from "../AbstractTallyProducer";
import { type WithRequired } from "../../../types/CommonTypes";

export interface NetClientProducerConfig extends ProducerConfig {
  host: string;
  port: number;
}

export abstract class AbstractNetClientTallyProducer<
  T extends TallyProducerEvents = TallyProducerEvents,
> extends AbstractTallyProducer<T> {
  declare protected _config: NetClientProducerConfig; // Declare to indicate it overwrites the parent's type.
  protected abstract _getDefaultConfig(): Omit<
    NetClientProducerConfig,
    "id" | "host"
  >;

  constructor(config: WithRequired<NetClientProducerConfig, "id" | "host">) {
    super(config);
  }

  protected _checkConfig(config: NetClientProducerConfig) {
    super._checkConfig(config);

    if (config.host == null || net.isIP(config.host) != 4)
      this._logger.fatal(
        `Valid IPv4 Host is required. Submitted config:`,
        config,
      );
    if (config.port == null || config.port < 0 || config.port > 65535)
      this._logger.fatal(`Valid Port is required. Submitted config:`, config);
  }

  async init(): Promise<void> {
    await super.init();
    await this.connect();
  }

  async destroy(): Promise<void> {
    this.markDestroying();
    await this.disconnect();
    await super.destroy();
  }

  abstract connect(): void | Promise<void>;
  abstract disconnect(): void | Promise<void>;
}
