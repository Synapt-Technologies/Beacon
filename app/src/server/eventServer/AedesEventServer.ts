import { EventEmitter } from "events";
import { EventServer, EventServerConfig, EventServerEvents, LightState } from "./EventServer";
import util from "node:util";

import { Aedes, AedesPublishPacket, Client, Subscription } from "aedes";
import { createServer, Server } from "node:net";

export interface AedesEventServerConfig extends EventServerConfig {
    serve_http: boolean,
    serve_ws: boolean
}

export class AedesEventServer extends EventEmitter<EventServerEvents> implements EventServer {

    private config: AedesEventServerConfig;
    private aedes!: Aedes;
    private server!: Server;

    constructor(config: AedesEventServerConfig) {
        super();

        config.name = config.name ??= "Aedes Event Server";
        // config.port = config.port ??= 1883;

        this.config = config;
    }

    async init() {
        this.aedes = await Aedes.createBroker();
        this.server = createServer(this.aedes.handle);

        const port: number = this.config.port;

        this.server.listen(port,  () => {
            console.log('[Aedes::'+(this.config.name ??= 'Aedes Server')+'] Server started and listening on port ', port)
        });

        if (this.aedes == undefined || this.server == undefined)
            return;

        this.aedes.on('subscribe', (subscriptions: Subscription[], client: Client) => {
            console.log('[Aedes::'+(this.config.name ??= 'Aedes Server')+'] Subscription: ', subscriptions);
               if (subscriptions.find((element) => element.topic.startsWith('tally/')))
                    this.emit('subscribe');
        });

        this.aedes.on('publish',  (packet, client) => {if (client) {
            console.log('[Aedes::'+this.config.name+'] Message: MQTT Client '+(client ? client.id : 'AEDES BROKER')+' has published message on '+packet.topic);
        }});
    }

    broadcastTally(state: LightState): void {
        if (this.aedes == undefined)
            throw new Error("Not yet initialized.");

        this.aedes.publish({
            cmd: 'publish',
            qos: 2,
            dup: false,
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
