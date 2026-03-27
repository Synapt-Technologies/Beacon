import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";


export interface EventServerConfig {
    port: number;
    name?: string;
}

export interface LightState extends TallyState {    
    alert: Array<number>;
}

export type EventServerEvents = {
    connection: [];
}


export interface EventServer extends EventEmitter<EventServerEvents> {
    broadcastTally(state: LightState): Promise<void>;

    init(): void;

    setName(name: string): void;
    getName(): string;
}