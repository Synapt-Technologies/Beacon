import net from "node:net";
import type { ProducerConfig } from "../../../types/ProducerTypes";
import {
  AbstractTallyProducer,
  type TallyProducerEvents,
} from "../AbstractTallyProducer";
import { ConnectionState, type WithRequired } from "../../../types/CommonTypes";

export interface NetClientProducerConfig extends ProducerConfig {
  host: string;
  port: number;
}

export abstract class AbstractNetClientTallyProducer<
  T extends TallyProducerEvents = TallyProducerEvents,
> extends AbstractTallyProducer<T> {
  declare protected config: NetClientProducerConfig; // Declare to indicate it overwrites the parent's type.
  protected abstract getDefaultConfig(): Omit<
    NetClientProducerConfig,
    "id" | "host"
  >;

  constructor(config: WithRequired<NetClientProducerConfig, "id" | "host">) {
    super(config);
  }

  protected checkConfig(config: NetClientProducerConfig) {
    super.checkConfig(config);

    if (config.host == null || net.isIP(config.host) != 4)
      this.logger.fatal(
        `Valid IPv4 Host is required. Submitted config:`,
        config,
      );
    if (config.port == null || config.port < 0 || config.port > 65535)
      this.logger.fatal(`Valid Port is required. Submitted config:`, config);
  }

  abstract connect(): void | Promise<void>;
  abstract disconnect(): void | Promise<void>;
}
