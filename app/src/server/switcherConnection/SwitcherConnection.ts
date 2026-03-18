import { EventEmitter } from "events";

export interface SwitcherConfig {
    name: string;
    host: string;
}

export interface SwitcherTallyState {
    moment: number | null;
    program: Array<number>;
    preview: Array<number>;
}

export interface SwitcherInfo {
    moment: number | null;
    connected: boolean;
}

export type SwitcherEvents = {
    connected: [];
    disconnected: [];
    tally_update: [SwitcherTallyState];
    info_update: [SwitcherInfo];
}

export interface SwitcherConnection extends EventEmitter<SwitcherEvents> {
    setConfig(config: SwitcherConfig): void;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getTallyState(): any;
    getInfo(): SwitcherInfo;
}