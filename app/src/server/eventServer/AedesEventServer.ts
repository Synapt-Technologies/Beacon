import { EventEmitter } from "events";
import { EventServer, EventServerConfig, EventServerEvents, LightState } from "./EventServer";
import util from "node:util";

import { Aedes, AedesPublishPacket, Client } from "aedes";
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

    async init(): Promise<void> {
        this._aedes = await Aedes.createBroker();
        this._server = createServer(this._aedes.handle);

        const port: number = this._config.port;

        this._server.listen(port, function () {
            console.log('server started and listening on port ', port)
        })

        this._aedes.on('publish', (packet: AedesPublishPacket, client: Client | null) => {
            console.log('[Aedes::'+this._config.name+'] Message: '+util.inspect(packet, false, null, true)+'\nFrom client: '+util.inspect(client, false, null, true));
        })
    }

    broadcastTally(state: LightState): Promise<void> {
        throw new Error("Method not implemented.");
    }
    setName(name: string): void {
        this._config.name = name;
    }
    getName(): string {
        return this._config.name ??= "Aedes Event Server";
    }

}
