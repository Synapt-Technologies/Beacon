import { EventEmitter } from "events";

import { SwitcherConnection, SwitcherConfig, SwitcherTallyState, SwitcherInfo, SwitcherEvents } from "./switcherConnection";
import { Atem, AtemState, Enums, Input } from "atem-connection";

interface AtemSwitcherConfig extends SwitcherConfig {
    port?: number;
}

interface AtemSwitcherInfo extends SwitcherInfo {
    state: AtemState | null;
}

export class AtemSwitcherConnection extends EventEmitter<SwitcherEvents> implements SwitcherConnection {

    private _atem: Atem;
    private _name: string;

    private _info: AtemSwitcherInfo = {
        moment: null,
        state: null,
        connected: false,
        host: null
    }

    private _tallyState: SwitcherTallyState = {
        moment: null,
        program: [],
        preview: [],
    };

    constructor(config: AtemSwitcherConfig) {
        super();

        this._atem = new Atem({
            address: config.host ??= "192.168.10.240",
            port: config.port ??= 9910
        });

        this._info.host = config.host ??= "192.168.10.240";

        this._name = config.name ??= "Atem Switcher";

        this._atem.on('info', (data) => {
            // this.logPrefix("INFO", data);
            console.log("[ATEM::" +this._name+"] Info: " + data);
            // this._parseAtem();
        });
        this._atem.on('error', (data) => {
            // this.logPrefix("ERROR", data)
            // this._parseAtem();
            console.log("[ATEM::" +this._name+"] ERROR: " + data);
        });

        this._atem.on('connected', () => {
            this._info.connected = true;
            this._info.moment = Date.now();
            this.emit('connected');
            console.log("[ATEM::" +this._name+"] Connected");
        })

        this._atem.on('disconnected', () => {
            this._info.connected = false;
            this._info.moment = Date.now();
            this.emit('disconnected');
            console.log("[ATEM::" +this._name+"] Disconnected");
        })

        this._atem.on('stateChanged', (state, pathToChange) => {
            // this._parseAtem();
            this._info.state = state;
            this._setTallystate();
            
            this.emit('info_update', this._info, pathToChange) // Only if something changed? e.g. no tally change.
            // console.log("[ATEM::" +this._name+"] Statechange: " + pathToChange);
        })
    }

    connect(): Promise<void> {
        if (this._info.host == null)
            return Promise.reject(new Error("Host is not set!"));

        return this._atem.connect(this._info.host);
    }
    disconnect(): Promise<void> {
        return this._atem.disconnect();
    }
    isConnected(): boolean {
        return this._info.connected;
    }
    getTallyState(): any {
        return this._tallyState;
    }

    _setTallystate(): void {
        this._tallyState.moment = Date.now();
        const newProgram: Array<number> = this._atem.listVisibleInputs("program");
        const newPreview: Array<number> = this._atem.listVisibleInputs("preview");

        if (newProgram.join(',') != this._tallyState.program.join(',') || newPreview.join(',') != this._tallyState.preview.join(',')){ // TODO Check if this is needed and smart.
            this._tallyState.program = newProgram;
            this._tallyState.preview = newPreview;
            this.emit("tally_update", this._tallyState);
        }
    }


    getInfo(): SwitcherInfo {
        return this._info;
    }
    getModel(): Enums.Model | null {
        if (!this._info.state) return null;
        return this._info.state.info.model;
    }
    getSources(): Map<number, { short: string | undefined; long: string | undefined }> | null {
        if (!this._info.state) return null;

        return new Map<number, { short: string | undefined; long: string | undefined }>
            (
                Object.entries(this._info.state.inputs)
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
        return this._name
    }

    setName(name: string): void {
        this._name = name;
    }
}