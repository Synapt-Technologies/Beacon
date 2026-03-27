import { EventEmitter } from "events";

export interface SwitcherConfig {
    name?: string;
    host?: string;
}

export interface SwitcherTallyState {
    moment: number | null;
    program: Array<number>;
    preview: Array<number>;
}

export interface SwitcherInfo {
    moment: number | null;
    connected: boolean;
    host: string | null;
}

export type SwitcherEvents = {
    connected: [];
    disconnected: [];
    tally_update: [SwitcherTallyState];
    info_update: [SwitcherInfo, path: string[] | null];
}

export interface SwitcherConnection extends EventEmitter<SwitcherEvents> {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getTallyState(): any;
    getInfo(): SwitcherInfo;

    getName(): string;
    setName(name: string): void;
}