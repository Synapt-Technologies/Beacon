import { EventEmitter } from "events";

import { SwitcherConnection, SwitcherConfig, SwitcherTallyState, SwitcherInfo, SwitcherEvents } from "./switcherConnection";
import { Atem, AtemState, Enums } from "atem-connection";

interface AtemSwitcherConfig extends SwitcherConfig {
    me: number;
}

interface AtemSwitcherInfo extends SwitcherInfo {
    state: AtemState | null;
}

export class AtemSwitcherConnection extends EventEmitter<SwitcherEvents> implements SwitcherConnection {

    private _atem: Atem;

    private _info: AtemSwitcherInfo = {
        moment: null,
        state: null,
        connected: false,
    }

    private _tallyState: SwitcherTallyState = {
        moment: null,
        program: [],
        preview: [],
    };

    constructor() {
        super();

        this._atem = new Atem();

        this._atem.on('info', (data) => {
            // this.logPrefix("INFO", data);
            // this._parseAtem();
        });
        this._atem.on('error', (data) => {
            // this.logPrefix("ERROR", data)
            // this._parseAtem();
        });

        this._atem.on('connected', () => {
            this._info.connected = true;
            this._info.moment = Date.now();
            this.emit('connected');
        })

        this._atem.on('disconnected', () => {
            this._info.connected = false;
            this._info.moment = Date.now();
            this.emit('disconnected');
        })

        this._atem.on('stateChanged', (state, pathToChange) => {
            // this.logPrefix('UPDATE', pathToChange);
            // this._parseAtem();
        })
    }

    setConfig(config: AtemSwitcherConfig): void {
    
    }
    connect(): Promise<void> {
        return Promise.resolve();
    }
    disconnect(): Promise<void> {
        return Promise.resolve();
    }
    isConnected(): boolean {
        return this._info.connected;
    }
    getTallyState(): any {
        return this._tallyState;
    }


    getInfo(): SwitcherInfo {
        return this._info;
    }
    getModel(): Enums.Model | null {
        if (!this._info.state) return null;
        return this._info.state.info.model;
    }
    getSources(): Array<{ id: number; name: string }> | null {
        if (!this._info.state) return null;
        if (!this._info.state.inputs || 
            this._info.state.inputs == undefined || 
            Object.keys(this._info.state.inputs).length === 0
        ) return null;
        return this._info.state.inputs.map(input => ({ id: input.inputId, name: input.longName }));
    }
}