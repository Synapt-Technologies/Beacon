import { AbstractTallyProducer, type ProducerConfig, type ProducerInfo, type ProducerTallyState, type TallyProducerEvents } from "../AbstractTallyProducer";
import net from "node:net";

export interface NetClientProducerConfig extends ProducerConfig {
    host?: string;
    port?: number;
} 

export interface NetClientProducerInfo extends ProducerInfo {
    connected: boolean;
}
export interface NetClientTallyProducerEvents extends TallyProducerEvents{
    connected: [];
    disconnected: [];
}

export abstract class AbstractNetClientTallyProducer<T extends NetClientTallyProducerEvents = NetClientTallyProducerEvents> extends AbstractTallyProducer<T> {
    
    protected declare config: Required<NetClientProducerConfig>; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: Required<NetClientProducerConfig> = {
        ...AbstractTallyProducer.DefaultConfig,
        host: "",
        port: -1,
    };

    protected abstract getDefaultConfig(): Required<NetClientProducerConfig>;

    constructor(config: NetClientProducerConfig) {
        super(config);
    }

    protected info: NetClientProducerInfo = {
        update_moment: null,
        model: "UNKNOWN",
        connected: false,
        sources: new Map(),
    };

    isConnected(): boolean {
        return this.info.connected;
    }
            
    protected checkConfig(config: NetClientProducerConfig) {
        super.checkConfig(config);
        
        if (config.host == null || net.isIP(config.host) != 4)
            this.logger.fatal(`Valid IPv4 Host is required. Submitted config:`, config);
        if (config.port == null || config.port < 0 || config.port > 65535)
            this.logger.fatal(`Valid Port is required. Submitted config:`, config);
    }

    abstract init(): void | Promise<void>;
    abstract destroy(): void | Promise<void>;

    abstract connect(): void | Promise<void>;
    abstract disconnect(): void | Promise<void>;

}
