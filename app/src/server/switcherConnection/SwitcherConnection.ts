import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";

export interface SwitcherConfig {
    name?: string;
    host?: string;
}

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

export interface SwitcherConnection extends EventEmitter<SwitcherEvents> {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getTallyState(): any;
    getInfo(): SwitcherInfo;

    getName(): string;
    setName(name: string): void;
}