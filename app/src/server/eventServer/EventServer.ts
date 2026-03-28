import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";


export interface EventServerConfig {
    port: number;
    name?: string;
}



export interface LightAlertState {
    number: number;
    type: "operator" | "talent";
}

export interface LightState extends TallyState {    
    alert?: Array<LightAlertState>;
}

export type EventServerEvents = {
    connection: [];
    subscribe: []
}


export abstract class EventServer extends EventEmitter<EventServerEvents> {
    abstract broadcastTally(state: LightState): void;

    abstract init(): void;

    abstract setName(name: string): void;
    abstract getName(): string;
}