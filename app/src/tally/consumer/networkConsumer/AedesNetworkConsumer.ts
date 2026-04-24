import { AbstractNetworkConsumer, type NetworkConsumerConfig, type NetworkConsumerInfo } from "./AbstractNetworkConsumer";
import { ConsumerStatus } from "../AbstractConsumer";

import { Aedes, type Client, type Subscription } from "aedes";
import { createServer, Server } from "node:net";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { WebSocketServer, createWebSocketStream } from "ws";
import { type DeviceAlertBundle, type DeviceTallyBundle, DeviceTallyState, type TallyDevice, type TallyDevice, TallyDeviceDto } from "../../types/DeviceTypes";
import type { SourceBus } from "../../types/SourceTypes";
import { SimpleBusNode } from "../../types/LogicTypes";

export interface AedesConsumerInfo extends NetworkConsumerInfo {
    tcp_active: boolean;
    ws_active: boolean;
}

export interface AedesConsumerConfig extends NetworkConsumerConfig {
    serve_tcp: boolean;
    serve_ws: boolean;
    ws_port: number;
}


export class AedesNetworkConsumer extends AbstractNetworkConsumer {

    protected declare config: Required<AedesConsumerConfig>; // Declare to indicate it overwrites the parent's type.
    protected info: AedesConsumerInfo = { 
        status: ConsumerStatus.OFFLINE, 
        device_count: 0,
        client_count: 0, 
        tcp_active: false, 
        ws_active: false, 
    };
    
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

    constructor(config: Partial<AedesConsumerConfig>) {
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
        try {
            this.aedes = await Aedes.createBroker();
        } catch (err) {
            this.info.status = ConsumerStatus.ERROR;
            return this.logger.fatal('Error starting Aedes broker:', err);
        }

        if (this.config.serve_tcp) {
            try {
                this.server = createServer(this.aedes.handle);

                await new Promise<void>((resolve, reject) => {
                    this.server.listen(this.config.port, () => {
                        this.info.tcp_active = true;
                        this.logger.info('Started and listening on port ', this.config.port);
                        resolve();
                    });

                    this.server.once('error', (err) => { // Pesky boot errors
                        this.logger.error('Error starting server:', err);
                        reject(err);
                    });
                });
            } catch (err) {
                this.info.status = ConsumerStatus.ERROR;
                this.logger.error('Error starting TCP server:', err);
            }
        }

        if (this.config.serve_ws) {
            try {
                this.wsHttpServer = createHttpServer();
                this.wss = new WebSocketServer({ server: this.wsHttpServer });
                this.wss.on('connection', (websocket, req) => {
                    const stream = createWebSocketStream(websocket);
                    this.aedes.handle(stream, req);
                });
                await new Promise<void>((resolve, reject) => {
                    this.wsHttpServer!.listen(this.config.ws_port, () => {
                        this.info.ws_active = true;
                        this.logger.info('WebSocket MQTT listening on port', this.config.ws_port);
                        resolve();
                    });
                    this.wsHttpServer!.once('error', (err) => {
                        this.logger.error('Error starting WebSocket server:', err);
                        reject(err);
                    });
                });

            }
            catch (err) {
                this.info.status = ConsumerStatus.ERROR;
                this.logger.error('Error starting WebSocket server:', err);
            }
        }

        this.aedes.on('subscribe', (subscriptions: Subscription[], client: Client) => {
            this.logger.debug('Subscription:', subscriptions);

            // if (subscriptions.some(sub => sub.topic == 'tally' || sub.topic.startsWith('tally/') ))
            //     this.emit('connection'); // TODO: Device Discovery, or on different topic?
        });

        this.aedes.on('publish',  (packet, client) => {if (client) {
            this.logger.debug('Message: MQTT Client', (client ? client.id : 'UNKNOWN ID'), 'has published message on', packet.topic);
        }});

        this.aedes.on('clientReady', (client: Client) => {
            this.info.client_count++;
            this.logger.info(`MQTT client ready: ${client?.id ?? 'unknown'}`);
        });

        this.aedes.on('clientDisconnect', (client: Client) => {
            this.info.client_count = Math.max(0, this.info.client_count - 1);
            this.logger.info(`MQTT client disconnected: ${client?.id ?? 'unknown'}`);
        });

        this.aedes.on('clientError', (client: Client, err: Error) => {
            this.logger.warn(`MQTT client error: ${client?.id ?? 'unknown'}`, err);
        });

        this.aedes.on('connectionError', (client: Client, err: Error) => {
            this.logger.warn(`MQTT connection error: ${client?.id ?? 'unknown'}`, err);
        });

        this.aedes.on('keepaliveTimeout', (client: Client) => {
            this.logger.warn(`MQTT keepalive timeout: ${client?.id ?? 'unknown'}`);
        });

        super.init(); // sets status ONLINE and starts keep-alive


        // const testTallyDevice1: TallyDevice = {
        //     id: { consumer: this.config.id, device: 'ad322df69708' },
        //     name: {long: 'Test Device 1' },
        //     connection: 2,
        //     logic: new SimpleBusNode([]),
        // };
        // const testTallyDevice2: TallyDevice = {
        //     id: { consumer: this.config.id, device: '9862eef93c9e' },
        //     name: {long: 'Test Device 2' },
        //     connection: 3,
        //     logic: new SimpleBusNode([]),
        
        // };

        this._addDevice(testTallyDevice1);
        this._addDevice(testTallyDevice2);
    }

    async destroy(): Promise<void> {
        super.destroy(); // sets status OFFLINE and stops keep-alive

        try {
            // Close aedes first — this sends DISCONNECT to all MQTT clients so
            // their TCP/WS connections drain before we close the servers.
            await new Promise<void>((resolve) => {
                this.aedes.close(() => resolve());
            });

            // Terminate any remaining WebSocket clients that didn't disconnect.
            if (this.wss) {
                for (const client of this.wss.clients) client.terminate();
                await new Promise<void>((r) => this.wss!.close(() => r()));
            }

            if (this.wsHttpServer) await new Promise<void>((r) => this.wsHttpServer!.close(() => r()));
            if (this.server)       await new Promise<void>((r) => this.server.close(() => r()));

            this.logger.debug('Destroyed successfully.');
        } catch (err) {
            this.logger.error('Error during shutdown:', err);
        }

        this.info.tcp_active = false;
        this.info.ws_active = false;
        this.info.client_count = 0;
    }

    isDeviceBroadcaster(): boolean {
        return true;
    }

    isTallyBroadcaster(): boolean {
        return true;
    }

    broadcastTally(bus: SourceBus): void {
        if (!this.aedes) {
            this.logger.warn("Discarding Tally: Attempted to send before initialization.");
            return;
        }

        const payload = JSON.stringify({
            program: Array.from(bus.program),
            preview: Array.from(bus.preview),
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

    sendDeviceState(bundle: DeviceTallyBundle): void {
        if (!this.aedes) {
            this.logger.warn("Discarding Tally: Attempted to send before initialization.");
            return;
        }

        const payload = JSON.stringify({
            ...bundle,
            state: DeviceTallyState[bundle.state], // Maybe send number for efficiency?
        }); // TODO: Broadcast more, like name?

        this.logger.debug(`Attempting to publish to MQTT for ${bundle.id.device}...`);

        this.aedes.publish(
        {
            cmd: 'publish',
            qos: 1,
            dup: false,
            topic: `tally/device/${bundle.id.consumer}/${bundle.id.device}`,
            payload: Buffer.from(payload),
            retain: true
        }, () => {});

        this.logger.debug(`Sent payload to device:`, payload);
       
    }
    sendDeviceAlert(bundle: DeviceAlertBundle): void {

        if (!this.aedes) {
            this.logger.warn("Discarding Tally: Attempted to send before initialization.");
            return;
        }

        this.aedes.publish({
            cmd: 'publish',
            qos: 2, // High priority for alerts
            dup: false,
            topic: `tally/device/${bundle.id.consumer}/${bundle.id.device}/alert`,
            payload: Buffer.from(JSON.stringify(bundle)),
            retain: false // Alerts are momentary, no retain
        }, () => {});
    }

}
