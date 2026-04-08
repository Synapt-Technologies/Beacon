import { AbstractConsumer, type ConsumerConfig, type ConsumerEvents } from "../AbstractConsumer";
import type { TallyState } from "../../types/ProducerStates";


export interface NetworkConsumerConfig extends ConsumerConfig {
    port?: number;
    keep_alive?: boolean;
    keep_alive_ms?: number;
    broadcast_all?: boolean; // Broadcast all tally states to the /tally topic.
} 

export type NetworkConsumerEvents = ConsumerEvents & {
    connection: []; // When A client loads, subscribes or whatever.
    disconnection: []; // When A client loads, subscribes or whatever.
    discovery: [id:string, outputs: any]
}

export abstract class AbstractNetworkConsumer<T extends NetworkConsumerEvents = NetworkConsumerEvents> extends AbstractConsumer<T> {
    
    protected declare config: Required<NetworkConsumerConfig>; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: Required<NetworkConsumerConfig> = {
        ...AbstractConsumer.DefaultConfig,
        port: -1,
        keep_alive: true,
        keep_alive_ms: 500,
        broadcast_all: true,
    };

    protected abstract getDefaultConfig(): Required<NetworkConsumerConfig>;
    
    private timer?: NodeJS.Timeout;

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

    abstract broadcastTally(): void;

    abstract broadcastKeepAlive(): void;

    init(): void | Promise<void> {

        if (this.config.keep_alive) { // TODO add keepalive with server info instead
            this.timer = setInterval(() => {
                this.broadcastKeepAlive();
            }, this.config.keep_alive_ms);
            this.logger.info("Set keep alive at ms:", this.config.keep_alive_ms);
        }
    }

    destroy(): void | Promise<void> {
        this.logger.debug('Destroying...');

        if (this.timer) 
            clearInterval(this.timer);
    }
}