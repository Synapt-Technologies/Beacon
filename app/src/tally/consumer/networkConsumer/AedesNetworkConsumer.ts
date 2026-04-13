import { AbstractNetworkConsumer, type NetworkConsumerConfig } from "./AbstractNetworkConsumer";
import { type IGlobalBroadcastConsumer } from "../IGlobalBroadcastConsumer";

import { Aedes, type Client, type Subscription } from "aedes";
import { createServer, Server } from "node:net";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { WebSocketServer, createWebSocketStream } from "ws";
import { type DeviceAddress, DeviceAlertState, DeviceAlertTarget, DeviceTallyState, type TallyDevice } from "../../types/ConsumerStates";

export interface AedesConsumerConfig extends NetworkConsumerConfig {
    serve_tcp?: boolean;
    serve_ws?: boolean;
    ws_port?: number;
}


export class AedesNetworkConsumer extends AbstractNetworkConsumer implements IGlobalBroadcastConsumer {
    
    protected declare config: Required<AedesConsumerConfig>; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: Required<AedesConsumerConfig> = {
        ...AbstractNetworkConsumer.DefaultConfig,
        id: "aedes",
        name: "MQTT Consumer",
        port: 1883,
        serve_tcp: true, // Right term?
        serve_ws: true,
        ws_port: 9001,
    };
    
    protected getDefaultConfig(): Required<AedesConsumerConfig> {
        return AedesNetworkConsumer.DefaultConfig;
    }

    constructor(config: AedesConsumerConfig) {
        super(config);
    }
    
    private aedes!: Aedes;
    private server!: Server;
    private wsHttpServer?: HttpServer;
    private wss?: WebSocketServer;

    protected checkConfig(config: AedesConsumerConfig) {
        super.checkConfig(config);

        if (config.serve_ws && (config.ws_port == null || config.ws_port < 0 || config.ws_port > 65535))
            this.logger.fatal(`Valid websocket Port is required. Submitted config:`, config);
    }
 
    async init(): Promise<void> {
        this.aedes = await Aedes.createBroker();

        if (this.config.serve_tcp) {
            this.server = createServer(this.aedes.handle);

            await new Promise<void>((resolve, reject) => {
                this.server.listen(this.config.port, () => {
                    this.logger.info('Started and listening on port ', this.config.port);
                    resolve();
                });

                this.server.once('error', (err) => { // Pesky boot errors
                    this.logger.error('Error starting server:', err);
                    reject(err);
                });
            });
        }


        if (this.config.serve_ws) {
            this.wsHttpServer = createHttpServer();
            this.wss = new WebSocketServer({ server: this.wsHttpServer });
            this.wss.on('connection', (websocket, req) => {
                const stream = createWebSocketStream(websocket);
                this.aedes.handle(stream, req);
            });
            await new Promise<void>((resolve, reject) => {
                this.wsHttpServer!.listen(this.config.ws_port, () => {
                    this.logger.info('WebSocket MQTT listening on port', this.config.ws_port);
                    resolve();
                });
                this.wsHttpServer!.once('error', (err) => {
                    this.logger.error('Error starting WebSocket server:', err);
                    reject(err);
                });
            });
        }

        this.aedes.on('subscribe', (subscriptions: Subscription[], client: Client) => {
            this.logger.debug('Subscription:', subscriptions);
            
            // if (subscriptions.some(sub => sub.topic == 'tally' || sub.topic.startsWith('tally/') ))
            //     this.emit('connection'); // TODO: Device Discovery
        });

        this.aedes.on('publish',  (packet, client) => {if (client) {
            this.logger.debug('Message: MQTT Client', (client ? client.id : 'UNKNOWN ID'), 'has published message on', packet.topic);
        }});

        super.init();


        // const testTallyDevice1: TallyDevice = {
        //     id: { consumer: this.config.id, device: 'ad322df69708' },
        //     name: {long: 'Test Device 1' },
        //     state: DeviceTallyState.NONE,
        //     connection: ConnectionType.NETWORK,
        //     patch: [],
        // };
        // const testTallyDevice2: TallyDevice = {
        //     id: { consumer: this.config.id, device: '9862eef93c9e' },
        //     name: {long: 'Test Device 2' },
        //     state: DeviceTallyState.NONE,
        //     connection: ConnectionType.NETWORK,
        //     patch: [],
        // };

        // this._addDevice(testTallyDevice1);
        // this._addDevice(testTallyDevice2);
    }

    async destroy(): Promise<void> {
        super.destroy();

        try {

            if (this.server) await new Promise<void>((r) => this.server.close(() => r()));
            if (this.wss) await new Promise<void>((r) => this.wss!.close(() => r()));
            if (this.wsHttpServer) await new Promise<void>((r) => this.wsHttpServer!.close(() => r()));

            await new Promise<void>((resolve) => {
                this.aedes.close(() => resolve());
            });

            this.logger.debug('Destroyed successfully.');
        } catch (err) {
            this.logger.error('Error during shutdown:', err);
        }
        
    }

    public publishDeviceTally(device: TallyDevice): void {
        this.sendTallyDevice(device);
    }

    broadcastTally(): void {
        if (!this.aedes) {
            this.logger.warn("Discarding Tally: Attempted to send before initialization.");
            return;
        }

        const payload = JSON.stringify({
            program: Array.from(this.tallyState.program),
            preview: Array.from(this.tallyState.preview),
            moment: Date.now()
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

    broadcastKeepAlive(): void {
        if (!this.aedes) {
            this.logger.warn("Discarding Keep-Alive: Attempted to send before initialization.");
            return;
        }

        const payload = JSON.stringify({
            moment: Date.now(),
            system: this.config.system_info
        });

        this.aedes.publish({
            cmd: 'publish',
            qos: 1, // At least once, or more
            dup: false,
            topic: 'system/info',
            payload: Buffer.from(payload),
            retain: false
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
