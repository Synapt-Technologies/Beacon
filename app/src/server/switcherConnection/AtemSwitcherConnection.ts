import { SwitcherConfig, SwitcherInfo, AbstractSwitcherConnection } from "./AbstractSwitcherConnection";
import { Atem, AtemState, Enums as AtemEnums, Input as AtemInput } from "atem-connection";

export interface AtemSwitcherConfig extends SwitcherConfig {
}


export interface AtemSwitcherInfo extends SwitcherInfo {
    state: AtemState | null;
}

// TODO Add check for AtemConnectionStatus
export class AtemSwitcherConnection extends AbstractSwitcherConnection {

    protected static readonly DefaultConfig = {
        ...super.DefaultConfig,
        name: "Atem",
        parent: "?P?",
        host: "192.168.10.240",
        port: 9910,
    }
    protected config: Required<AtemSwitcherConfig> = AtemSwitcherConnection.DefaultConfig;

    private atem: Atem;

    protected info: AtemSwitcherInfo = {
        moment: null,
        state: null,
        connected: false,
    }

    constructor(config: AtemSwitcherConfig) {
        super();

        this.config = {...this.config, ...config};

        this.checkConfig();

        this.atem = new Atem({
            address: config.host,
            port: config.port
        });

        this.atem.on('info', (data) => {
            this.devLog("Info:", data);
        });
        this.atem.on('error', (data) => {
            this.devLog("ERROR:", data);
        });

        this.atem.on('connected', () => {
            this.info.connected = true;
            this.info.moment = Date.now();
            this.info.state = this.atem.state ?? null;
            this.emit('connected');
            this.devLog("Connected to model:", this.getModel());
            this._setTallystate();
        })

        this.atem.on('disconnected', () => {
            this.info.connected = false;
            this.info.moment = Date.now();
            this.emit('disconnected');
            this.devLog("Disconnected");
        })

        this.atem.on('stateChanged', (state, pathToChange) => {
            this.info.state = state;
            this._setTallystate();
            
            this.emit('info_update', this.info, pathToChange) // TODO: Only if something changed? e.g. on tally change. Switcher model won't change without reconnect.
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

    _setTallystate(): void { // TODO: Rename.
        this.tallyState.moment = Date.now();
        const newProgram: Array<number> = this.atem.listVisibleInputs("program");
        const newPreview: Array<number> = this.atem.listVisibleInputs("preview");

        if (newProgram.join(',') != this.tallyState.program.join(',') || newPreview.join(',') != this.tallyState.preview.join(',')){ // TODO Check if this is needed and smart.
            this.tallyState.program = newProgram;
            this.tallyState.preview = newPreview;
            this.emit("tally_update", this.tallyState);
            this.devLog("Tally Change:", this.tallyState);
        }
    }

    getModel(): string | null {
        if (!this.info.state || !this.info.state.info.model || !this.info.connected) return null;
        return AtemEnums.Model[this.info.state.info.model];
    }
    
    getSources(): Map<number, { short: string | undefined; long: string | undefined }> | null {
        if (!this.info.state || !this.info.connected) return null;

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



}