import { EventEmitter } from "events";
import { EventServer, EventServerConfig, EventServerEvents, LightState } from "./EventServer";

import { Aedes, Client, Subscription } from "aedes";
import { createServer, Server } from "node:net";

export interface AedesEventServerConfig extends EventServerConfig {
    serve_http?: boolean;
    serve_ws?: boolean;
    ws_port?: number;
} // TODO ADD DEFAULTS



export class AedesEventServer extends EventServer {

    protected static readonly DefaultConfig = {
        ...super.DefaultConfig,
        name: "Aedes",
        parent: "?P?",
        port: 1883,
        keep_alive: false,
        keep_alive_ms: 1000,
        serve_http: true,
        serve_ws: true,
        ws_port: 80
    }

    protected config: Required<AedesEventServerConfig> = AedesEventServer.DefaultConfig;

    private aedes!: Aedes;
    private server!: Server;

    constructor(config: AedesEventServerConfig) {
        super();

        this.config = {...AedesEventServer.DefaultConfig, ...config};
        
        this.checkConfig();
    }

    protected checkConfig() {
        super.checkConfig();
        if (this.config.ws_port < 0 || this.config.ws_port > 65535)
            throw new Error("Port is required");
    }

    // TODO: Add factory method! EventServerFactory.create(type, config): EventServer
    async init() { 
        this.aedes = await Aedes.createBroker();
        this.server = createServer(this.aedes.handle);

        this.server.listen(this.config.port,  () => {
            this.devLog('Server started and listening on port ', this.config.port)
        });

        if (this.aedes == undefined || this.server == undefined)
            return;

        this.aedes.on('subscribe', (subscriptions: Subscription[], client: Client) => {
            this.devLog('Subscription:', subscriptions);
            
            if (subscriptions.some(sub => sub.topic == 'tally' || sub.topic.startsWith('tally/') ))
                this.emit('subscribe');
        });

        this.aedes.on('publish',  (packet, client) => {if (client) {
            this.devLog('Message: MQTT Client', (client ? client.id : 'AEDES BROKER'), 'has published message on', packet.topic);
        }});
    }

    broadcastTally(state: LightState): void {
        this.intBroadcastTally(state, false);
    }

    protected intBroadcastTally(state: LightState, duplicate: boolean = false): void {
        if (this.aedes == undefined)
            throw new Error("Not yet initialized.");

        this.aedes.publish({
            cmd: 'publish',
            qos: 1, // At least once, or more
            dup: duplicate,
            topic: 'tally',
            payload: Buffer.from(JSON.stringify(state)),
            retain: false
        }, () => {});
    }
    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name ??= "Aedes Event Server";
    }

}
