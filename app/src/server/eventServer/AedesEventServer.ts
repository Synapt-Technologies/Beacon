import { EventEmitter } from "events";
import { EventServer, EventServerConfig, EventServerEvents, LightState } from "./EventServer";
import util from "node:util";

import { Aedes, AedesPublishPacket, Client, Subscription } from "aedes";
import { createServer, Server } from "node:net";

export interface AedesEventServerConfig extends EventServerConfig {
}

export class AedesEventServer extends EventEmitter<EventServerEvents> implements EventServer {

    private _config: AedesEventServerConfig;
    private _aedes!: Aedes;
    private _server!: Server;

    constructor(config: AedesEventServerConfig) {
        super();

        config.name = config.name ??= "Aedes Event Server";
        // config.port = config.port ??= 1883;

        this._config = config;
    }

    async init() {
        this._aedes = await Aedes.createBroker();
        this._server = createServer(this._aedes.handle);

        const port: number = this._config.port;

        this._server.listen(port,  () => {
            console.log('[Aedes::'+(this._config.name ??= 'Aedes Server')+'] Server started and listening on port ', port)
        });

        if (this._aedes == undefined || this._server == undefined)
            return;

        this._aedes.on('subscribe', (subscriptions: Subscription[], client: Client) => {
            console.log('[Aedes::'+(this._config.name ??= 'Aedes Server')+'] Subscription: ', subscriptions);
               if (subscriptions.find((element) => element.topic.startsWith('tally/')))
                    this.emit('subscribe');
        });

        this._aedes.on('publish',  (packet, client) => {if (client) {
            console.log('[Aedes::'+this._config.name+'] Message: MQTT Client '+(client ? client.id : 'AEDES BROKER')+' has published message on '+packet.topic);
        }});
    }

    broadcastTally(state: LightState): void {
        if (this._aedes == undefined)
            throw new Error("Not yet initialized.");

        this._aedes.publish({
            cmd: 'publish',
            qos: 2,
            dup: false,
            topic: 'tally',
            payload: Buffer.from(JSON.stringify(state)),
            retain: false
        }, () => {});
    }
    setName(name: string): void {
        this._config.name = name;
    }
    getName(): string {
        return this._config.name ??= "Aedes Event Server";
    }

}
