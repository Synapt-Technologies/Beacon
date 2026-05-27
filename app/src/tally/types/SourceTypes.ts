import type { ConnectionState, DisplayName } from "./CommonTypes";
import type { ProducerId, ProducerState } from "./ProducerTypes";


export type BusId = string;
export type SourceId = string;

export type GlobalSourceKey = `${ProducerId}:${SourceId}`;
export type GlobalBusKey = `${ProducerId}:${BusId}`;


// ? Sources
export interface GlobalSourceAddress {
    producer: ProducerId;
    source: SourceId;
}

export interface SourceInfo {
    id: GlobalSourceAddress;
    name: DisplayName;
}

export type SourceMap = Map<GlobalSourceKey, SourceInfo>; // TODO: Should this be a set?


// ? Busses
export interface GlobalBusAddress {
    producer: ProducerId;
    bus: BusId;
}

export interface SourceBusInfo {
    id: GlobalBusKey;
    name: DisplayName;
}

export interface SourceBus extends SourceBusInfo {
    sources: Set<GlobalSourceKey>;
}


// ? Bus Maps
export type ProducerBusMap = Map<GlobalBusKey, SourceBus>;

export interface ProducerBusState extends ProducerState{
    busses: ProducerBusMap;
}

export type GlobalProducerMap = Map<ProducerId, ProducerBusState>;

// TODO: Add an interface to map Busses to colors or select which busses to display?


export abstract class SourceTools {
    //? Source Address
    static createSourceKey (producer: ProducerId, source: SourceId): GlobalSourceKey {
        return `${producer}:${source}` as GlobalSourceKey;
    }

    static toSourceKey (key: GlobalSourceAddress): GlobalSourceKey {
        return `${key.producer}:${key.source}` as GlobalSourceKey;
    }

    static parseSourceKey (key: GlobalSourceKey): GlobalSourceAddress {
        const [producer, ...sourceParts] = key.split(":");
        return { producer, source: sourceParts.join(":") };
    }


    //? Source Bus
    static toBusKey (producer: ProducerId, bus: BusId): GlobalBusKey {
        return `${producer}:${bus}` as GlobalBusKey;
    }

    static parseBusKey (key: GlobalBusKey): GlobalBusAddress {
        const [producer, ...busParts] = key.split(":");
        return { producer, bus: busParts.join(":") };
    }


    //? Bus Equals
    static areSourceSetsEqual(a: Set<GlobalSourceKey>, b: Set<GlobalSourceKey>): boolean {
        if (a.size !== b.size) return false;
        for (const item of a) {
            if (!b.has(item)) return false;
        }
        return true;
    }

    static areSourceBussesEqual(a: SourceBus, b: SourceBus, onlySources: boolean = true): boolean {


        if (!onlySources) 
        {
            if (a.name.long !== b.name.long) return false;
            if (a.name.short !== b.name.short) return false;

            if (a.id !== b.id) return false;
        }

        if (!this.areSourceSetsEqual(a.sources, b.sources)) return false;

        return true;
    }

    static areBusMapsEqual(a: ProducerBusMap, b: ProducerBusMap, onlySources: boolean = true): boolean {
        if (a.size !== b.size) return false;

        for (const [key, bus] of a) {
            const otherBus = b.get(key);
            if (!otherBus) return false;
            if (!this.areSourceBussesEqual(bus, otherBus, onlySources)) return false;
        }

        return true;
    }

    static areProducerBusStatesEqual(a: ProducerBusState, b: ProducerBusState, onlySources: boolean = true): boolean {

        if (!onlySources) 
        {
            if (a.state !== b.state) return false;
        }
        
        return this.areBusMapsEqual(a.busses, b.busses, onlySources);
    }

    static areGlobalProducerMapsEqual(a: GlobalProducerMap, b: GlobalProducerMap, onlySources: boolean = true): boolean {
        if (a.size !== b.size) return false;
        for (const [producer, busState] of a) {
            const otherBusState = b.get(producer);
            if (!otherBusState) return false;
            if (!this.areProducerBusStatesEqual(busState, otherBusState, onlySources)) return false;
        }

        return true;
    }

}
