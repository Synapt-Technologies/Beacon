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


export interface EventServer extends EventEmitter<EventServerEvents> {
    broadcastTally(state: LightState): void;

    init(): void;

    setName(name: string): void;
    getName(): string;
}