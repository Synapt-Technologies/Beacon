import { AbstractNetworkConsumer, type NetworkConsumerConfig } from "./AbstractNetworkConsumer";

import { Aedes, type Client, type Subscription } from "aedes";
import { createServer, Server } from "node:net";
import { type DeviceAddress, DeviceAlertState, DeviceAlertTarget, DeviceTallyState, type TallyDevice } from "../../types/ConsumerStates";

export interface AedesConsumerConfig extends NetworkConsumerConfig {
    serve_tcp?: boolean;
    serve_ws?: boolean;
    ws_port?: number;
}


export class AedesNetworkConsumer extends AbstractNetworkConsumer {
    
    protected declare config: Required<AedesConsumerConfig>; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: Required<AedesConsumerConfig> = {
        ...AbstractNetworkConsumer.DefaultConfig,
        id: "aedes",
        name: "MQTT Consumer",
        port: 1883,
        keep_alive: true,
        keep_alive_ms: 1000,
        serve_tcp: true, // Right term?
        serve_ws: true, // TODO Implement.
        ws_port: 80,
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
            
            // if (subscriptions.some(sub => sub.topic == 'tally' || sub.topic.startsWith('tally/') ))
            //     this.emit('connection'); // TODO: Device Discovery
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

    broadcastTally(): void {
        if (!this.aedes) {
            this.logger.warn("Discarding Tally: Attempted to send before initialization.");
            return;
        }

        const payload = JSON.stringify({
            program: Array.from(this.tallyState.program),
            preview: Array.from(this.tallyState.preview),
            ts: Date.now()
        });

        this.aedes.publish({
            cmd: 'publish',
            qos: 1, // At least once, or more
            dup: false,
            topic: 'tally/global',
            payload: Buffer.from(payload),
            retain: true
        }, () => {});
    }

    protected sendTallyDevice(device: TallyDevice): void {
        if (!this.aedes) {
            this.logger.warn("Discarding Tally: Attempted to send before initialization.");
            return;
        }

        const payload = JSON.stringify({
            state: DeviceTallyState[device.state], // Maybe send number for efficiency?
            name: device.name,
            moment: this.tallyState.moment
        });
        
        this.logger.debug(`Attempting to publish to MQTT for ${device.id.device}...`);
        
        this.aedes.publish(
        {
            cmd: 'publish',
            qos: 1,
            dup: false,
            topic: `tally/device/${device.id.device}`,
            payload: Buffer.from(payload),
            retain: true
        }, () => {});

        this.logger.debug(`Sent payload to device:`, payload);
       
    }

    setDeviceAlert(address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget): void {
        if (!this.aedes) {
            this.logger.warn("Discarding Tally: Attempted to send before initialization.");
            return;
        }

        this.aedes.publish({
            cmd: 'publish',
            qos: 2, // High priority for alerts
            dup: false,
            topic: `tally/device/${address.device}/alert`,
            payload: Buffer.from(JSON.stringify({ type, target })),
            retain: false // Alerts are momentary, no retain
        }, () => {});
    }

}
