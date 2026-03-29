import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";


export interface EventServerConfig {
    name?: string;
    parent?: string;
    port?: number;
} // TODO ADD DEFAULTS

const DefaultEventServerConfig = {
    name: "Event Server",
    parent: "?P?",
    port: -1
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

    protected readonly conType: string = "EVENT"

    protected devLog(...data: any[]) {
        console.log(...['['+(this.config.parent ??= '??')+'::'+this.conType+'::'+(this.config.name ??= 'Event Server')+'] ', ...data]);
    }
    
    protected config: Required<EventServerConfig> = DefaultEventServerConfig;

    
    protected checkConfig() {
        if (this.config.port < 0 || this.config.port > 65535)
            throw new Error("Port is required");
    }
    
    abstract broadcastTally(state: LightState): void;

    abstract init(): void;

    abstract setName(name: string): void;
    abstract getName(): string;
}