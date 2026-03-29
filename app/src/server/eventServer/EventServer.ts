import { EventEmitter } from "events";
import { TallyState } from "../types/TallyState";


export interface EventServerConfig {
    name?: string;
    parent?: string;
    port?: number;
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

// TODO: Make into AbstractNetworkTallyConsumer -imp-> AbstractTallyConsumer
export abstract class EventServer extends EventEmitter<EventServerEvents> {

    protected readonly conType: string = "EVENT"

    protected static readonly DefaultConfig = {
        name: "Event Server",
        parent: "??",
        port: -1,
    }
    protected config: Required<EventServerConfig> = EventServer.DefaultConfig;

    protected lightState: LightState = {
        alert: [],
        program: [],
        preview: []
    };

    protected devLog(...data: any[]) {
        console.log(...['['+(this.config.parent ??= '??')+'::'+this.conType+'::'+(this.config.name ??= 'Event Server')+'] ', ...data]);
    }
        
    protected checkConfig() {
        if (this.config.port < 0 || this.config.port > 65535)
            throw new Error("Port is required");
    }
    
    broadcastTally(state: LightState): void {
        this.lightState = state;
    }

    abstract init(): void;

    abstract setName(name: string): void;
    abstract getName(): string;
}