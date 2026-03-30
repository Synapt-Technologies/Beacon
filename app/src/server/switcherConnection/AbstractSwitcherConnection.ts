import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";
import net from "node:net";

export interface SwitcherConfig {
    name?: string;
    parent?: string;
    host?: string;
    port?: number;
}


export interface SwitcherTallyState extends TallyState {
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

    protected readonly conType: string = "SWITCHER";

    protected config: Required<SwitcherConfig>;

    // Static + function: Static removes recursion, function makes it so the parent constructor gets the child's values.
    public static readonly DefaultConfig: Required<SwitcherConfig> = { 
        name: "Switcher",
        parent: "??",
        host: "",
        port: -1
    };

    protected abstract getDefaultConfig(): Required<SwitcherConfig>;

    constructor(config: SwitcherConfig) {
        super();

        this.config = {...this.getDefaultConfig(), ...config};
        
        this.checkConfig(this.config);
    }

    protected checkConfig(config: SwitcherConfig) {
        if (config.host == null || net.isIP(config.host) != 4)
            throw new Error(`[${config.name}] Valid IPv4 Host is required`);
        if (config.port == null || config.port < 0 || config.port > 65535)
            throw new Error(`[${config.name}] Valid Port is required`);
    }

    protected info: SwitcherInfo = {
        moment: null,
        connected: false,
    };

    protected tallyState: SwitcherTallyState = {
        moment: null,
        program: [],
        preview: [],
        alert: [],
    };

    abstract init(): void | Promise<void>; // Prepare and connect.

    abstract connect(): Promise<void>; // Just connect, called by init()
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

    setName(name: string): void {
        this.config.name = name;
    }
    getName(): string {
        return this.config.name;
    }

    protected devLog(...data: any[]) {
        console.log(`[${this.config.parent}::${this.conType}::${this.config.name}]`, ...data);
    }

}