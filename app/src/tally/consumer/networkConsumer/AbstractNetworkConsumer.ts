import { AbstractConsumer, type ConsumerConfig, type ConsumerEvents } from "../AbstractConsumer";
import type { TallyState } from "../../types/ProducerStates";


export interface NetworkConsumerConfig extends ConsumerConfig {
    port?: number;
    broadcast?: boolean;
    broadcast_ms?: number;
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
        broadcast: true,
        broadcast_ms: 1000,
        broadcast_all: false,
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

    init(): void | Promise<void> {
        // if (this.config.broadcast) { // TODO add keepalive with server info instead
        //     this.timer = setInterval(() => {
        //         this.broadcastTally();
        //     }, this.config.broadcast_ms);
        // }
    }

    destroy(): void | Promise<void> {
        if (this.timer) 
            clearInterval(this.timer);
    }
}