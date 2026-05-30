

import { Aedes, type Client, type Subscription } from "aedes";
import { createServer, Server } from "node:net";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { WebSocketServer, createWebSocketStream } from "ws";
import { AbstractNetServerConsumer, type NetServerConsumerConfig } from "./AbstractNetServerConsumer";
import type { IBroadcastConsumer } from "../IBroadcastConsumer";
import { ConnectionState, TallyState, type DisplayName } from "../../types/CommonTypes";
import type { ConsumerInfo } from "../../types/ConsumerTypes";
import type { DeviceAddress, DeviceAlertBundle, DeviceAlertData, DeviceDiscoveryMessage, DeviceRuntimeConfig, DeviceRuntimeConfigBundle, DeviceStateBundle, GlobalDeviceRuntimeConfig } from "../../types/DeviceTypes";
import type { SourceInfo } from "../../types/SourceTypes";


export interface AedesConsumerConfig extends NetServerConsumerConfig {
    serve_tcp: boolean;
    serve_ws: boolean;
    ws_port: number;
    cancel_on_transport_failure: boolean;
}

export interface AedesConsumerInfo extends ConsumerInfo {
    tcp_active: boolean;
    ws_active: boolean;
    client_count: number;
}

// ? payloads:
interface DeviceMqttPayload {
    moment: number;
}
// TODO: make this extend exiting interfaces?
interface DeviceStateMqttPayload extends DeviceMqttPayload {
    state: { 
        name: string; 
        num: TallyState 
    };
    active_sources: Record<string, SourceInfo>;
    moment: number;
}

// TODO: Check these payloads.
interface DeviceAlertMqttPayload extends DeviceMqttPayload, DeviceAlertData{ /* empty */ }

interface DeviceRuntimeConfigMqttPayload extends DeviceMqttPayload, DeviceRuntimeConfig, GlobalDeviceRuntimeConfig  { /* empty */ }


export class AedesNetServerConsumer extends AbstractNetServerConsumer implements IBroadcastConsumer {
    
    protected declare _config: AedesConsumerConfig; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: AedesConsumerConfig = {
        id: "aedes",
        name: "MQTT Consumer",
        port: 1883,
        serve_tcp: true,
        serve_ws: true,
        ws_port: 9001,
        keep_alive: true,
        keep_alive_ms: 500,
        cancel_on_transport_failure: false,
    };
    
    protected _getDefaultConfig(): AedesConsumerConfig {
        return AedesNetServerConsumer.DefaultConfig;
    }
    
    protected declare _info: AedesConsumerInfo;
    
    constructor(config: Partial<AedesConsumerConfig>) {
        super(config);
        this._info = {
            ...this._info,
            tcp_active: false,
            ws_active: false,
            client_count: 0,
        }
    }
    
    protected _checkConfig(config: AedesConsumerConfig) {
        super._checkConfig(config);
        
        if (config.serve_ws && (config.ws_port == null || config.ws_port < 0 || config.ws_port > 65535))
            this._logger.fatal(`Valid websocket Port is required. Submitted config:`, config);
    }
    
    private _aedes?: Aedes;
    private _server?: Server;
    private _wsHttpServer?: HttpServer;
    private _wsServer?: WebSocketServer;
    
    protected async _init(): Promise<void> {
        
        const _enterFailState = async () => {
            this._info.state = ConnectionState.FAILED;
            
            await this._closeTransports();
            
            this._emitInfoUpdate();
            
            this._logger.error("Entered FAILED state.");
            return;
        };
        
        try {
            this._aedes = await Aedes.createBroker();
        } catch (err) {
            this._logger.error('Error starting Aedes broker:', err)
            return await _enterFailState();
        }

        try {
            await Promise.race([
                new Promise<void>((resolve, reject) => {
                    type AedesPersistence = {
                        createRetainedStream(topic: string): NodeJS.ReadableStream;
                        cleanRetained(topic: string, cb: () => void): void;
                    };
                    const persistence = (this._aedes as unknown as { persistence: AedesPersistence }).persistence;
                    const stream = persistence.createRetainedStream('#');
                    const clears: Promise<void>[] = [];
                    stream.on('data', (packet: { topic: string }) => {
                        clears.push(
                            new Promise<void>((res) => {
                                persistence.cleanRetained(packet.topic, () => res())
                            }
                        ));
                    });
                    stream.on('end', async () => { await Promise.all(clears); resolve(); });
                    stream.on('error', (err) => {
                        this._logger.warn('Error clearing retained messages:', err);
                        reject(err);
                    });
                }),
                new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
            ]);
            this._logger.debug('Cleared retained messages.');
        } catch (err) {
            this._logger.warn('Error clearing retained messages on startup:', err);
        }
        
        if (this._config.serve_tcp) {
            try {
                this._server = createServer(this._aedes.handle);
                this._server.on('connection', (socket) => socket.setNoDelay(true));
                
                await new Promise<void>((resolve, reject) => {
                    this._server!.listen(this._config.port, () => {
                        this._logger.info('Started and listening on port ', this._config.port);
                        resolve();
                    });
                    
                    this._server!.once('error', (err) => { // Pesky boot errors
                        this._logger.error('Error starting server:', err);
                        reject(err);
                    });
                });
                
                this._info.tcp_active = true;
            } catch (err) {
                this._logger.error('Error starting TCP server:', err);

                if (this._config.cancel_on_transport_failure) {
                    return await _enterFailState(); // Handles setting the state.
                }
                else {
                    this._info.state = ConnectionState.ERROR;
                    this._emitInfoUpdate();
                }
            }
        }
        
        if (this._config.serve_ws) {
            try {
                this._wsHttpServer = createHttpServer();
                this._wsServer = new WebSocketServer({ server: this._wsHttpServer });
                this._wsServer.on('connection', (websocket, req) => {
                    const stream = createWebSocketStream(websocket);
                    this._aedes?.handle(stream, req);
                });
                await new Promise<void>((resolve, reject) => {
                    this._wsHttpServer!.listen(this._config.ws_port, () => {
                        this._logger.info('WebSocket MQTT listening on port', this._config.ws_port);
                        resolve();
                    });
                    this._wsHttpServer!.once('error', (err) => {
                        this._logger.error('Error starting WebSocket server:', err);
                        reject(err);
                    });
                });
                
                this._info.ws_active = true;
            }
            catch (err) {
                this._logger.error('Error starting WebSocket server:', err);

                if (this._config.cancel_on_transport_failure) {
                    return await _enterFailState(); // Handles setting the state.
                }
                else {
                    this._info.state = ConnectionState.ERROR;
                    this._emitInfoUpdate();
                }
            }
        }
        
        if (!this._info.tcp_active && !this._info.ws_active) {
            this._logger.error('Failed to start any transport! Entering FAILED state...');
            return await _enterFailState();
        }
        
        //? Aedes event handlers
        this._aedes.on('subscribe', (subscriptions: Subscription[], _client: Client) => {
            this._logger.debug('Subscription:', subscriptions); // TODO: Remove?
        });
              
        this._aedes.on('publish', (packet, client) => {
            if (!client) return; // broker-internal messages
            
            this._logger.debug('Message: MQTT Client', client.id, 'has published message on', packet.topic);
            
            if (packet.topic === 'device/discovery') {
                try {
                    const discovery: DeviceDiscoveryMessage = JSON.parse(packet.payload.toString());
                    this._processDeviceDiscovery(discovery);
                } catch (err) {
                    this._logger.warn(`Failed to parse discovery packet from client ${client.id}:`, err);
                }
            }
            else if (packet.topic.startsWith('system/time/request/')) {
                try {
                    const t2 = Date.now(); // Capture immediately
                    const { t1 } = JSON.parse(packet.payload.toString());

                    const deviceId = packet.topic.slice('system/time/request/'.length);
                    
                    this._aedes?.publish({
                        cmd: 'publish', qos: 0, dup: false, retain: false,
                        topic: 'system/time/response/'+deviceId,
                        payload: Buffer.from(JSON.stringify({ t1, t2 })),
                    }, () => {});
                } catch (err) {
                    this._logger.warn(`Failed to process time request from client ${client.id}:`, err);
                }
            }
        });
        
        this._aedes.on('clientReady', (client: Client) => {
            this._info.client_count++;
            this._logger.info(`MQTT client ready: ${client?.id ?? 'unknown'}`);
            this._emitInfoUpdate();
        });
        
        this._aedes.on('clientDisconnect', (client: Client) => {
            this._info.client_count = Math.max(0, this._info.client_count - 1);
            this._logger.info(`MQTT client disconnected: ${client?.id ?? 'unknown'}`);
            this._emitInfoUpdate();
        });
        
        this._aedes.on('clientError', (client: Client, err: Error) => {
            this._logger.warn(`MQTT client error: ${client?.id ?? 'unknown'}`, err);
        });
        
        this._aedes.on('connectionError', (client: Client, err: Error) => {
            this._logger.warn(`MQTT connection error: ${client?.id ?? 'unknown'}`, err);
        });
        
        this._aedes.on('keepaliveTimeout', (client: Client) => {
            this._logger.warn(`MQTT keepalive timeout: ${client?.id ?? 'unknown'}`); // TODO: Should this be logged? Happens a lot. Check why it happens.
        });
        
        if (this._info.state !== ConnectionState.ERROR)
            this._info.state = ConnectionState.ONLINE;
        this._emitInfoUpdate();
        
        
        // const testTallyDevice1: TallyDevice = {
        //     id: { consumer: this.config.id, device: 'ad322df69708' },
        //     name: {long: 'Test Device 1' },
        //     state: TallyState.NONE,
        //     connection: 2,
        //     patch: [],
        // };
        // const testTallyDevice2: TallyDevice = {
        //     id: { consumer: this.config.id, device: '9862eef93c9e' },
        //     name: {long: 'Test Device 2' },
        //     state: TallyState.NONE,
        //     connection: 3,
        //     patch: [],
        // };
        
        // this._addDevice(testTallyDevice1);
        // this._addDevice(testTallyDevice2);
    }

    // TODO: Move to a common place and use in more places?
    private async _closeWithTimeout(
        server: { close(cb: (err?: Error) => void): void } | undefined,
        ms: number,
        name: string,
        onClosed?: () => void,
    ): Promise<void> {
        if (!server) return;
        await Promise.race([
            new Promise<void>(r => server.close((err) => {
                if (err) this._logger.warn(`${name} close error:`, err);
                else this._logger.debug(`${name} closed.`);
                r();
            })),
            new Promise<void>(r => setTimeout(() => {
                this._logger.warn(`${name} did not close within ${ms}ms.`);
                r();
            }, ms)),
        ]);
        onClosed?.();
    }


    private async _closeTransports(): Promise<void> {
        
        await this._closeWithTimeout(this._aedes, 5000, 'Aedes MQTT broker', () => this._aedes = undefined);

        if (this._wsServer) for (const client of this._wsServer.clients) client.terminate();

        await Promise.all([
            this._closeWithTimeout(this._wsServer, 2000, 'WebSocket server', () => this._wsServer = undefined),
            this._closeWithTimeout(this._wsHttpServer, 1000, 'WebSocket HTTP server', () => this._wsHttpServer = undefined),
            this._closeWithTimeout(this._server, 1000, 'TCP server', () => this._server = undefined),
        ]);     

    }
    
    protected async _destroy(): Promise<void> {
       
        try {
            await this._closeTransports();
            
            this._logger.debug('Destroyed successfully.');
        } catch (err) {
            this._logger.error('Error while destroying AedesNetServerConsumer:', err);
        }
        
        this._info.tcp_active = false;
        this._info.ws_active = false;
        this._info.client_count = 0;
    }

    private _publish(address: DeviceAddress, subtopic: string, payload: DeviceMqttPayload, qos: 0|1|2, retain: boolean): void {
        if (!this._aedes) {
            this._logger.warn("Attempting to publish before initialization. Discarding.");
            return;
        }

        const topic = `device/${address.consumer}/${address.device}/${subtopic}`;

        try {
            this._aedes.publish({
                cmd: 'publish', 
                qos, 
                dup: false, 
                topic: topic,
                payload: Buffer.from(JSON.stringify(payload)),
                retain
            }, () => {});
            this._logger.debug(`Published to ${topic}:`, payload);
        } catch (err) {
            this._logger.error(`Error publishing to MQTT topic ${topic}:`, err);
        }
    }
    
    protected _sendDeviceState(bundle: DeviceStateBundle): void {

        const payload: DeviceStateMqttPayload = {
            state: { 
                name: TallyState[bundle.data.state], 
                num: bundle.data.state 
            },
            active_sources: Object.fromEntries(bundle.data.active_sources),
            moment: bundle.moment,
        };

        this._publish(bundle.id, "tally", payload, 1, true);
    }

    protected _sendDeviceAlert(bundle: DeviceAlertBundle): void {

        const payload: DeviceAlertMqttPayload = {
            moment: bundle.moment,
            ...bundle.data.alert
        };

        this._publish(bundle.id, "alert", payload, 2, false);        
    }

    protected _sendDeviceRuntimeConfig(bundle: DeviceRuntimeConfigBundle): void {
        
        const payload: DeviceRuntimeConfigMqttPayload = {
            moment: bundle.moment,
            ...bundle.data.runtime,
            ...bundle.data.global,
        };

        this._publish(bundle.id, "config/runtime", payload, 2, true);                        
    }

    // TODO: Rewrite below VV
    protected onDeviceDiscovered(packet: DeviceDiscoveryPacket): void {
        this.logger.info(`Device discovered via MQTT: ${packet.name} (${packet.id})`);
        
        const device: TallyDevice = GlobalDeviceTools.defaultDevice({
            id: { consumer: this.config.id, device: packet.id },
            name: { 
                long: packet.name ?? packet.model ?? packet.id 
            },
            model: packet.model,
            connection: packet.connection ?? ConnectionType.NETWORK, // Discovered, but not yet patched
        });
        
        this._addDevice(device);
    }
    
    public publishDeviceTally(device: TallyDevice): void {
        this.sendDeviceTally(device);
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
    
    deleteDevice(address: DeviceAddress): void {
        super.deleteDevice(address);
        
        
        //Remove retained messages.
        if (!this.aedes) {
            this.logger.warn("Discarding Device Deletion: Attempted to send before initialization.");
            return;
        }
        
        this.aedes.publish({
            cmd: 'publish',
            qos: 1,
            dup: false,
            topic: `tally/device/${address.consumer}/${address.device}`,
            payload: Buffer.alloc(0), // Empty payload to clear retained message
            retain: true
        }, () => {});
        
        this.aedes.publish({
            cmd: 'publish',
            qos: 1,
            dup: false,
            topic: `tally/device/${address.consumer}/${address.device}/config`,
            payload: Buffer.alloc(0), // Empty payload to clear retained message
            retain: true
        }, () => {});
        
        this.aedes.publish({
            cmd: 'publish',
            qos: 1,
            dup: false,            
            topic: `tally/device/${address.consumer}/${address.device}/fields`,
            payload: Buffer.alloc(0), // Empty payload to clear retained message
            retain: true
        }, () => {});
    }
    
    
    protected sendDeviceTally(device: TallyDevice): void {
        if (!this.aedes) {
            this.logger.warn("Discarding Tally: Attempted to send before initialization.");
            return;
        }
        
        const payload = JSON.stringify({
            state:  TallyState[device.state],
            ss:     device.state,
            moment: this.tallyState.moment
        });
        
        this.logger.debug(`Attempting to publish to MQTT for ${device.id.device}...`);
        
        this.aedes.publish(
            {
                cmd: 'publish',
                qos: 1,
                dup: false, // TODO: topic becomes /device/x/x/tally?
                topic: `tally/device/${device.id.consumer}/${device.id.device}`, // TODO: Add /tally?
                payload: Buffer.from(payload),
                retain: true
            }, () => {});
            
            this.logger.debug(`Sent payload to device:`, payload);
            
        }
        
        // TODO Implement configurable/variable fields.
        protected sendDeviceFields(device: TallyDevice): void {
            if (!this.aedes) {
                this.logger.warn("Discarding FIELDS: Attempted to send before initialization.");
                return;
            }
            
            const payload = JSON.stringify({
                "1": device.name,
            });
            
            this.logger.debug(`Attempting to publish to MQTT for ${device.id.device}...`);
            
            this.aedes.publish(
                {
                    cmd: 'publish',
                    qos: 1,
                    dup: false,  // TODO: topic becomes /device/x/x/fields?
                    topic: `tally/device/${device.id.consumer}/${device.id.device}/fields`,
                    payload: Buffer.from(payload),
                    retain: true
                }, () => {});
                
                this.logger.debug(`Sent payload to device:`, payload);
                
            }
            
            protected sendDeviceConfig(device: TallyDevice): void {
                if (!this.aedes) {
                    this.logger.warn("Discarding CONFIG: Attempted to send before initialization.");
                    return;
                }
                
                //TODO Maybe use defaultDevice helper?
                
                // TODO: Make flips sides boolean?
                const payload = JSON.stringify({
                    brightness: device.brightness !== undefined ? (device.brightness * 255 / 100) : 255,
                    // brightness: 10,
                    name: device.name,
                    state_on_disconnect: this.disconnectState,
                    flip_sides: device.flip ? 1 : 0,
                    // flip_sides: true ? 1 : 0,
                    moment: Date.now()
                });
                
                this.logger.debug(`Attempting to publish CONFIG over MQTT for ${device.id.device}...`);
                
                this.aedes.publish(
                    {
                        cmd: 'publish',
                        qos: 1,
                        dup: false, // TODO: topic becomes /device/x/x/config?
                        topic: `tally/device/${device.id.consumer}/${device.id.device}/config`,
                        payload: Buffer.from(payload),
                        retain: true
                    }, () => {});
                    
                    this.logger.debug(`Sent payload to device:`, payload);
                    
                }
                
                setDeviceAlert(address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget, time: number): void {
                    if (!this.aedes) {
                        this.logger.warn("Discarding Tally: Attempted to send before initialization.");
                        return;
                    }
                    
                    this.aedes.publish({
                        cmd: 'publish',
                        qos: 2, // High priority for alerts
                        dup: false,  // TODO: topic becomes /device/x/x/alert?
                        topic: `tally/device/${address.consumer}/${address.device}/alert`,
                        payload: Buffer.from(JSON.stringify({ type, target, time })),
                        retain: false // Alerts are momentary, no retain
                    }, () => {});
                }
                
            }
            