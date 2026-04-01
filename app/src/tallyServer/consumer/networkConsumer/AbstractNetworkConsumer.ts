import { EventEmitter } from "node:events";
import { AbstractConsumer, ConsumerConfig, ConsumerEvents } from "../AbstractConsumer";
import { TallyState } from "../../types/TallyState";


export interface NetworkConsumerConfig extends ConsumerConfig {
    port?: number;
    keep_alive?: boolean;
    keep_alive_ms?: number;
} 

export interface NetworkConsumerEvents extends ConsumerEvents {
    connection: []; // When A client loads, subscribes or whatever.
    disconnection: []; // When A client loads, subscribes or whatever.
    discovery: [id:string, outputs: any]
}

export abstract class AbstractNetworkConsumer<T extends NetworkConsumerEvents = NetworkConsumerEvents> extends AbstractConsumer<T> {
    
    protected declare config: Required<NetworkConsumerConfig>; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: Required<NetworkConsumerConfig> = {
        ...AbstractConsumer.DefaultConfig,
        port: -1,
        keep_alive: false,
        keep_alive_ms: 1000
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
        this.broadcastTally(false);
    }

    abstract broadcastTally(retransmission: boolean): void;

    init(): void | Promise<void> {
        if (this.config.keep_alive) {
            this.timer = setInterval(() => {
                this.broadcastTally(true);
            }, this.config.keep_alive_ms);
        }
    }

    destroy(): void | Promise<void> {
        if (this.timer) 
            clearInterval(this.timer);
    }
}