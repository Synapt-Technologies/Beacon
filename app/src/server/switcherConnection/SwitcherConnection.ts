import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";
import net from "node:net";

export interface SwitcherConfig {
    name?: string;
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

export abstract class SwitcherConnection extends EventEmitter<SwitcherEvents> {

    protected config: SwitcherConfig = {
        name: "Switcher Connection"
    };

    protected checkConfig() {
        if (this.config.host == null || !net.isIP(this.config.host))
            throw new Error("Host is required");
        if (this.config.port == null || this.config.port < 0 || this.config.port > 65535)
            throw new Error("Port is required");
    }

    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract isConnected(): boolean;
    abstract getTallyState(): any;
    abstract getInfo(): SwitcherInfo;

    abstract getName(): string;
    abstract setName(name: string): void;
}