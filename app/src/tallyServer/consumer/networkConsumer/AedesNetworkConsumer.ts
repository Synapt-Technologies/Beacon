import { AbstractNetworkConsumer, NetworkConsumerConfig } from "./AbstractNetworkConsumer";

import { Aedes, Client, Subscription } from "aedes";
import { createServer, Server } from "node:net";
import { DeviceAddress, DeviceAlertState, DeviceAlertTarget } from "../../types/DeviceState";

export interface AedesConsumerConfig extends NetworkConsumerConfig {
    serve_tcp?: boolean;
    serve_ws?: boolean;
    ws_port?: number;
}


export class AedesNetworkConsumer extends AbstractNetworkConsumer {
    setDeviceAlert(address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget): void {
        throw new Error("Method not implemented.");
    }

    protected declare config: Required<AedesConsumerConfig>; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: Required<AedesConsumerConfig> = {
        ...AbstractNetworkConsumer.DefaultConfig,
        name: "Aedes",
        port: 1883,
        keep_alive: true,
        keep_alive_ms: 1000,
        serve_tcp: true, // Right term?
        serve_ws: true,
        ws_port: 80
    };
    
    protected getDefaultConfig(): Required<AedesConsumerConfig> {
        return AedesNetworkConsumer.DefaultConfig;
    }

    constructor(config: AedesConsumerConfig) {
        super(config);
    }
    
    private aedes!: Aedes;
    private server!: Server;

    protected checkConfig(config: AedesConsumerConfig) {
        super.checkConfig(config);
        
        if (config.ws_port == null || config.ws_port < 0 || config.ws_port > 65535)
            this.logger.fatal(`Valid websocket Port is required. Submitted config:`, config);
    }

    async init(): Promise<void> {
        this.aedes = await Aedes.createBroker();
        this.server = createServer(this.aedes.handle);

        await new Promise<void>((resolve, reject) => {
            this.server.listen(this.config.port,  () => {
                this.logger.info('Started and listening on port ', this.config.port);
                resolve();
            });

            this.server.once('error', (err) => { // Pesky boot errors
                this.logger.error('Error starting server:', err);
                reject(err);
            });
        });


        this.aedes.on('subscribe', (subscriptions: Subscription[], client: Client) => {
            this.logger.debug('Subscription:', subscriptions);
            
            if (subscriptions.some(sub => sub.topic == 'tally' || sub.topic.startsWith('tally/') ))
                this.emit('connection');
        });

        this.aedes.on('publish',  (packet, client) => {if (client) {
            this.logger.debug('Message: MQTT Client', (client ? client.id : 'UNKNOWN ID'), 'has published message on', packet.topic);
        }});

        super.init();
    }

    async destroy(): Promise<void> {
        super.destroy();

        await new Promise<void>((resolve) => {
            this.server.close(() => resolve());
        });
        
        await this.aedes.close();
    }

    broadcastTally(retransmission: boolean): void {
        if (this.aedes == undefined)
            throw new Error("Not yet initialized.");

        this.aedes.publish({
            cmd: 'publish',
            qos: 1, // At least once, or more
            dup: retransmission, // Might not be necessary.
            topic: 'tally',
            payload: Buffer.from(JSON.stringify(this.tallyState)),
            retain: false
        }, () => {});
    }

}
