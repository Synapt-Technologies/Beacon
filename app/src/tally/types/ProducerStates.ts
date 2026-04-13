import type { ProducerConfig, ProducerInfo } from "../producer/AbstractTallyProducer";


export type ProducerId = string;
export type SourceId = string;

export interface ProducerModel {
    short?: string;
    long?: string;
}

export interface GlobalTallySource {
    producer: ProducerId;
    source: SourceId; // TODO Add optional bus info, e.g. aux
}

export interface SourceInfo {
    source: GlobalTallySource;
    long: string;
    short: string;
}

// TODO Add short and long names
export interface TallyState { // Use GlobalSourceTools to parse GlobalTallySources
    program: Set<string>;
    preview: Set<string>;
    moment?: number;
}

export type SourceMap = Map<string, SourceInfo>;

export interface ProducerBundle {
    type: string,
    config: ProducerConfig,
    info: ProducerInfo
}


export abstract class GlobalSourceTools {
    static create (producer: ProducerId, source: SourceId): string {
        return `${producer}:${source}`;
    } 

    static parse (key: string): GlobalTallySource {
        const [producer, ...sourceParts] = key.split(":");
        return { producer, source: sourceParts.join(":") };
    }

    private static areSetsEqual(a: Set<string>, b: Set<string>) {
        if (a.size !== b.size) return false;
        for (const item of a) {
            if (!b.has(item)) return false;
        }
        return true;
    }

    static areTallyStatesEqual(a: TallyState, b: TallyState): boolean {
        if (!this.areSetsEqual(a.program, b.program)) 
            return false;
        if (!this.areSetsEqual(a.preview, b.preview)) 
            return false;

        return true;
    }

    static serialize(state: TallyState) {
        return {
            ...state,
            program: Array.from(state.program),
            preview: Array.from(state.preview),
        }
    }
};