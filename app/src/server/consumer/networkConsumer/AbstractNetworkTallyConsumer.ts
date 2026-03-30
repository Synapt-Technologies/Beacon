import { EventEmitter } from "node:events";
import { AbstractTallyConsumer, ConsumerConfig, LightState, TallyConsumerEvents } from "../AbstractTallyConsumer";


export interface NetworkConsumerConfig extends ConsumerConfig {
    port?: number;
    keep_alive?: boolean;
    keep_alive_ms?: number;
} 

export interface NetworkTallyConsumerEvents extends TallyConsumerEvents {
    connection: []; // When A client loads, subscribes or whatever.
    disconnection: []; // When A client loads, subscribes or whatever.
    discovery: [id:string, outputs: any]
}

export abstract class AbstractNetworkTallyConsumer<T extends NetworkTallyConsumerEvents = NetworkTallyConsumerEvents> extends AbstractTallyConsumer<T> {
    
    protected declare config: Required<NetworkConsumerConfig>; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: Required<NetworkConsumerConfig> = {
        ...AbstractTallyConsumer.DefaultConfig,
        port: -1,
        keep_alive: false,
        keep_alive_ms: 1000
    };
    
    private timer?: NodeJS.Timeout;

    constructor(config: ConsumerConfig) {
        super(config); // TODO: Check if this handles the default correctly.
    }
        
    protected checkConfig(config: NetworkConsumerConfig) { // TODO Apply this style in the switcher connection too.
        super.checkConfig(config);
        
        if (config.port == null || config.port < 0 || config.port > 65535) // TODO propegate to other check configs
            throw new Error(`[${config.name}] Valid Port is required`);
    }
    
    consumeTally(state: LightState): void {
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