import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";


export interface EventServerConfig {
    port?: number;
    name?: string;
} // TODO ADD DEFAULTS



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
    
    protected config: EventServerConfig = {
        name: "Event Server"
    };

    
    protected checkConfig() {
        if (this.config.port == null || this.config.port < 0 || this.config.port > 65535)
            throw new Error("Port is required");
    }
    
    abstract broadcastTally(state: LightState): void;

    abstract init(): void;

    abstract setName(name: string): void;
    abstract getName(): string;
}