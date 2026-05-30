import { type WithRequired } from "../../types/CommonTypes";
import type { ConsumerConfig } from "../../types/ConsumerTypes";
import { AbstractConsumer, type ConsumerEvents } from "../AbstractConsumer";


export interface NetServerConsumerConfig extends ConsumerConfig {
    port: number;
    keep_alive: boolean;
    keep_alive_ms: number;
} 


export abstract class AbstractNetServerConsumer<T extends ConsumerEvents = ConsumerEvents> extends AbstractConsumer<T> {
    
    protected declare _config: NetServerConsumerConfig; // Declare to indicate it overwrites the parent's type.
    protected abstract _getDefaultConfig(): NetServerConsumerConfig;


    constructor(config: NetServerConsumerConfig) {
        super(config);
    }
        
    protected _checkConfig(config: NetServerConsumerConfig) {
        super._checkConfig(config);
        
        if (config.port == null || config.port < 0 || config.port > 65535)
            this._logger.fatal(`Valid Port is required. Submitted config:`, config);

        if (config.keep_alive && (config.keep_alive_ms == null || config.keep_alive_ms < 100))
            this._logger.fatal(`When keep_alive is enabled, keep_alive_ms must be set to at least 100ms. Submitted config:`, config);
    }

    protected abstract _broadcastKeepAlive(): void;

    async init(): Promise<void> {
        await super.init();

        if (this._config.keep_alive) {
            this._keepAliveTimer = setInterval(() => {
                this._broadcastKeepAlive();
            }, this._config.keep_alive_ms);
            this._logger.debug("Started keep alive at ms:", this._config.keep_alive_ms);
        }
    }

    async destroy(): Promise<void> {
        this.markDestroying();

        if (this._keepAliveTimer) {
            clearInterval(this._keepAliveTimer);
            this._logger.debug("Stopped keep alive.");
        }

        await super.destroy();
    }

    private _keepAliveTimer?: NodeJS.Timeout;

}