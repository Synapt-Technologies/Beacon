import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";
import net from "node:net";

export interface SwitcherConfig {
    name?: string;
    parent?: string;
    host?: string;
    port?: number;
} // TODO ADD DEFAULTS


export interface SwitcherTallyState extends TallyState{
    moment: number | null;
}

export interface SwitcherInfo {
    moment: number | null;
    connected: boolean;
}

export type SwitcherEvents = {
    connected: [];
    disconnected: [];
    tally_update: [SwitcherTallyState];
    info_update: [SwitcherInfo, path: string[] | null];
}

// TODO: Change into a more generic producer, that can produce different fields. Program preview with priorities or alertstate. Higher priority overrites lower / they are combined.
export abstract class AbstractSwitcherConnection extends EventEmitter<SwitcherEvents> {

    protected readonly conType: string = "SWITCH";

    protected static readonly DefaultConfig = {
        name: "Switcher",
        parent: "??",
        host: "",
        port: -1
    }
    protected config: Required<SwitcherConfig> = AbstractSwitcherConnection.DefaultConfig;

    protected devLog(...data: any[]) {
        console.log(...['['+(this.config.parent ??= '??')+'::'+this.conType+'::'+(this.config.name ??= 'Switcher Connection')+'] ', ...data]);
    }

    protected info: SwitcherInfo = {
        moment: null,
        connected: false,
    };

    protected tallyState: SwitcherTallyState = {
        moment: null,
        program: [],
        preview: [],
    };

    protected checkConfig() {
        if (this.config.host == null || net.isIP(this.config.host) != 4)
            throw new Error("Host is required");
        if (this.config.port == null || this.config.port < 0 || this.config.port > 65535)
            throw new Error("Valid Port is required");
    }

    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    
    isConnected(): boolean {
        return this.info.connected;
    }

    getTallyState(): any {
        return this.tallyState;
    }

    getInfo(): SwitcherInfo {
        return this.info;
    }

    abstract getSources(): Map<number, { short: string | undefined; long: string | undefined }> | null;

    abstract getModel(): string | null;

    getName(): string {
        return this.config.name ??= "Unnamed Switcher";
    }

    setName(name: string): void {
        this.config.name = name;
    }
}