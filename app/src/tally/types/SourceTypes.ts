import type { ProducerId } from "./ProducerTypes";


export type BusId = string;
export type SourceId = string;

export type GlobalSourceKey = `${ProducerId}:${SourceId}`;

export interface ProducerModel {
    short?: string;
    long?: string;
}


export interface GlobalSource {
    producer: ProducerId;
    source: SourceId;
    // bus?: BusId; // TODO Add bus support, maybe per bus map instead?
}

export class GlobalSourceDto implements GlobalSource {
    producer: ProducerId;
    source: SourceId;

    constructor(producer: ProducerId, source: SourceId) {
        this.producer = producer;
        this.source = source;
    }

    static from(source: GlobalSource | GlobalSourceKey): GlobalSourceDto {
        if (typeof source === "string") {
            return this.fromKey(source);
        }

        return new GlobalSourceDto(source.producer, source.source);
    }

    static fromKey(key: GlobalSourceKey): GlobalSourceDto {
        const [producer, ...sourceParts] = key.split(":");
        return new GlobalSourceDto(producer, sourceParts.join(":"));
    }

    toKey(): GlobalSourceKey {
        return `${this.producer}:${this.source}` as GlobalSourceKey;
    }

    toString(): string {
        return this.toKey();
    }

    toJSON(): GlobalSource {
        return {
            producer: this.producer,
            source: this.source,
        };
    }
}

export interface SourceBus {
    program: Set<GlobalSourceKey>;
    preview: Set<GlobalSourceKey>;
    moment?: number;
}

export class SourceBusDto implements SourceBus {

    public program: Set<GlobalSourceKey>;
    public preview: Set<GlobalSourceKey>;
    public moment?: number;

    constructor(
        program: Set<GlobalSourceKey>,
        preview: Set<GlobalSourceKey>,
        moment?: number
    ) {
        this.program = program;
        this.preview = preview;
        this.moment = moment;
    }

    static from(sourceBus: SourceBus): SourceBusDto {
        return new SourceBusDto(
            new Set(sourceBus.program),
            new Set(sourceBus.preview),
            sourceBus.moment
        );
    }

    private areSetsEqual(a: Set<GlobalSourceKey>, b: Set<GlobalSourceKey>): boolean {
        if (a.size !== b.size) return false;
        for (const item of a) {
            if (!b.has(item)) return false;
        }
        return true;
    }

    equals(other: SourceBusDto | SourceBus): boolean {
        if (!(other instanceof SourceBusDto))
            other = SourceBusDto.from(other);

        if (!this.areSetsEqual(this.program, new Set(other.program))) 
            return false;
        if (!this.areSetsEqual(this.preview, new Set(other.preview))) 
            return false;

        return true;
    }

    serialize() {
        return {
            program: Array.from(this.program),
            preview: Array.from(this.preview),
            moment: this.moment
        }
    }
}


export interface SourceName {
    long: string;
    short?: string;
}

export interface SourceInfo {
    source: GlobalSource;
    name: SourceName;
}

export type SourceMap = Map<GlobalSourceKey, SourceInfo>;
