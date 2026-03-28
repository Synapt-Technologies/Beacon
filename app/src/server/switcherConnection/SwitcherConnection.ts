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

export abstract class SwitcherConnection extends EventEmitter<SwitcherEvents> {

    protected config: SwitcherConfig = {};


    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract isConnected(): boolean;
    abstract getTallyState(): any;
    abstract getInfo(): SwitcherInfo;

    abstract getName(): string;
    abstract setName(name: string): void;
}