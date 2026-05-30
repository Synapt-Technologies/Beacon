import type { ConsumerConfig } from "../../types/ConsumerTypes";
import { AbstractConsumer, type ConsumerEvents } from "../AbstractConsumer";


export interface NetworkConsumerConfig extends ConsumerConfig {
    port?: number;
    keep_alive?: boolean;
    keep_alive_ms?: number;
} 

export type NetworkConsumerEvents = ConsumerEvents & {
    connection: []; // When A client loads, subscribes or whatever.
    disconnection: []; // When A client loads, subscribes or whatever.
}

export abstract class AbstractNetworkConsumer<T extends NetworkConsumerEvents = NetworkConsumerEvents> extends AbstractConsumer<T> {
    
    protected declare _config: Required<NetworkConsumerConfig>; // Declare to indicate it overwrites the parent's type.
    protected abstract _getDefaultConfig(): Omit<NetworkConsumerConfig, "id" | "port">;


    constructor(config: NetworkConsumerConfig) {
        super(config);
    }
        
    protected checkConfig(config: NetworkConsumerConfig) {
        super.checkConfig(config);
        
        if (config.port == null || config.port < 0 || config.port > 65535)
            this.logger.fatal(`Valid Port is required. Submitted config:`, config);
    }
    
    consumeTally(state: TallyState): void {
        super.consumeTally(state);
        
        if (this.config.broadcast_all) {
            this.broadcastTally();
        }
    }

    // TODO: Move to globalBroadcastConsumer? Or change that to GlobalDeviceBroadcastConsumer and create a GlobalBroadcastConsumer interface? Not all consumers need to broadcast all tally.
    abstract broadcastTally(): void; // Global Tally broadcast, not device specific.

    // TODO: Move to some sort of NetworkConsumer class or interface? Not all consumers need to broadcast keep alive.
    abstract broadcastKeepAlive(): void;

    init(): Promise<void> {
        super.init();

        this.info.port = this.config.port;

        if (this.config.keep_alive) { // TODO add keepalive with server info instead
            this.timer = setInterval(() => {
                this.broadcastKeepAlive();
            }, this.config.keep_alive_ms);
            this.logger.debug("Started keep alive at ms:", this.config.keep_alive_ms);
        }

        this.info.status = ConsumerStatus.ONLINE;
    }

    destroy(): Promise<void> {
        this.logger.debug('Destroying...');

        super.destroy();

        if (this.timer)
            clearInterval(this.timer);

        this.info.status = ConsumerStatus.OFFLINE;
    }

    private timer?: NodeJS.Timeout;

}