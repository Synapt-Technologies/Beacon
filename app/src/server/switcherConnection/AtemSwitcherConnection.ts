import { EventEmitter } from "events";

import { SwitcherConnection, SwitcherConfig, SwitcherTallyState, SwitcherInfo, SwitcherEvents } from "./switcherConnection";
import { Atem, AtemState, Enums, Input } from "atem-connection";

export interface AtemSwitcherConfig extends SwitcherConfig {
    port?: number;
}

export interface AtemSwitcherInfo extends SwitcherInfo {
    state: AtemState | null;
}

export class AtemSwitcherConnection extends EventEmitter<SwitcherEvents> implements SwitcherConnection {

    private atem: Atem;
    private config: AtemSwitcherConfig;

    private info: AtemSwitcherInfo = {
        moment: null,
        state: null,
        connected: false,
    }

    private _tallyState: SwitcherTallyState = {
        moment: null,
        program: [],
        preview: [],
    };

    constructor(config: AtemSwitcherConfig) {
        super();

        config.host = config.host ??= "192.168.10.240";
        config.port = config.port ??= 9910;
        config.name = config.name ??= "Atem Switcher";

        this.atem = new Atem({
            address: config.host,
            port: config.port
        });

        this.config = config;


        this.atem.on('info', (data) => {
            // this.logPrefix("INFO", data);
            console.log("[ATEM::" +this.config.name+"] Info: " + data);
            // this._parseAtem();
        });
        this.atem.on('error', (data) => {
            // this.logPrefix("ERROR", data)
            // this._parseAtem();
            console.log("[ATEM::" +this.config.name+"] ERROR: " + data);
        });

        this.atem.on('connected', () => {
            this.info.connected = true;
            this.info.moment = Date.now();
            this.emit('connected');
            console.log("[ATEM::" +this.config.name+"] Connected");
        })

        this.atem.on('disconnected', () => {
            this.info.connected = false;
            this.info.moment = Date.now();
            this.emit('disconnected');
            console.log("[ATEM::" +this.config.name+"] Disconnected");
        })

        this.atem.on('stateChanged', (state, pathToChange) => {
            // this._parseAtem();
            this.info.state = state;
            this._setTallystate();
            
            this.emit('info_update', this.info, pathToChange) // Only if something changed? e.g. no tally change.
            // console.log("[ATEM::" +this._name+"] Statechange: " + pathToChange);
        })
    }

    connect(): Promise<void> {
        if (this.config.host == null)
            return Promise.reject(new Error("Host is not set!"));

        return this.atem.connect(this.config.host);
    }
    disconnect(): Promise<void> {
        return this.atem.disconnect();
    }
    isConnected(): boolean {
        return this.info.connected;
    }
    getTallyState(): any {
        return this._tallyState;
    }

    _setTallystate(): void {
        this._tallyState.moment = Date.now();
        const newProgram: Array<number> = this.atem.listVisibleInputs("program");
        const newPreview: Array<number> = this.atem.listVisibleInputs("preview");

        if (newProgram.join(',') != this._tallyState.program.join(',') || newPreview.join(',') != this._tallyState.preview.join(',')){ // TODO Check if this is needed and smart.
            this._tallyState.program = newProgram;
            this._tallyState.preview = newPreview;
            this.emit("tally_update", this._tallyState);
        }
    }


    getInfo(): SwitcherInfo {
        return this.info;
    }
    getModel(): Enums.Model | null {
        if (!this.info.state) return null;
        return this.info.state.info.model;
    }
    getSources(): Map<number, { short: string | undefined; long: string | undefined }> | null {
        if (!this.info.state) return null;

        return new Map<number, { short: string | undefined; long: string | undefined }>
            (
                Object.entries(this.info.state.inputs)
                    .filter(([, value]) => value != undefined)
                    .map(([key, value]) => {
                        return [
                            Number(key),
                            {
                                short: value?.shortName,
                                long: value?.longName
                            }
                        ];
                    })
            );
    }

    getName(): string {
        return this.config.name ??= "Atem Switcher";
    }

    setName(name: string): void {
        this.config.name = name;
    }
}