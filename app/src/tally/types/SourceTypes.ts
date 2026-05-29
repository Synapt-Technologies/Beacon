import type { DisplayName } from "./CommonTypes";
import type { ProducerId, ProducerState } from "./ProducerTypes";

export type BusId = string;
// TODO: Colon sanitization, some producers might contain colons in their names. Be it due to the source type, or them allowing user defined keys.
export type BusGroupId = string;
export type SourceId = string;

export type GlobalSourceKey = `${ProducerId}:${SourceId}`;

// TODO: Colon sanitization, some producers might contain colons in their names. Be it due to the source type, or them allowing user defined keys.
export type GlobalBusGroupKey = `${ProducerId}:${BusGroupId}`;
export type GlobalBusKey = `${GlobalBusGroupKey}:${BusId}`;

// ? Sources
export interface GlobalSourceAddress {
  producer: ProducerId;
  source: SourceId;
}

export interface SourceInfo {
  id: GlobalSourceAddress;
  name: DisplayName;
}

export type SourceMap = Map<GlobalSourceKey, SourceInfo>; // Not a set, because it wont work on the SourceInfo object.

// ? Busses
export interface GlobalBusGroupAddress {
  producer: ProducerId;
  group: BusGroupId;
}

export interface GlobalBusAddress extends GlobalBusGroupAddress {
  bus: BusId;
}


export interface SourceBusInfo {
  id: GlobalBusAddress;
  name: DisplayName;
  index: number; // For ordering busses in the UI. 
}

export interface SourceBusState extends SourceBusInfo {
  sources: Set<GlobalSourceKey>;
}

// ? Bus Groups
export interface SourceBusGroupInfo {
  id: GlobalBusGroupAddress;
  name: DisplayName;
  index: number; // For ordering groups in the UI. 
}

export interface SourceBusGroupState extends SourceBusGroupInfo {
  busses: Map<GlobalBusKey, SourceBusState>;
}

// TODO: Maybe add a map type with only the nested bus state map, without the info?

// ? Bus Maps
export type BusGroupInfoMap = Map<GlobalBusGroupKey, SourceBusGroupInfo>;
export type BusGroupStateMap = Map<GlobalBusGroupKey, SourceBusGroupState>;

export interface ProducerBusState extends ProducerState {
  busses: BusGroupStateMap;
}

export type GlobalProducerMap = Map<ProducerId, ProducerBusState>;

// TODO: Add an interface to map Busses to colors or select which busses to display?

export abstract class SourceTools {
  //? Source Address
  static fromParts(producer: ProducerId, source: SourceId): GlobalSourceKey {
    return `${producer}:${source}` as GlobalSourceKey;
  }

  static fromAddress(key: GlobalSourceAddress): GlobalSourceKey {
    return SourceTools.fromParts(key.producer, key.source);
  }

  static toAddress(key: GlobalSourceKey): GlobalSourceAddress {
    const [producer, ...sourceParts] = key.split(":");
    return { producer, source: sourceParts.join(":") };
  }
}
export abstract class BusTools {
  //? Source Bus
  static fromParts(producer: ProducerId, bus: BusId): GlobalBusKey {
    return `${producer}:${bus}` as GlobalBusKey;
  }

  static fromGroupedParts(
    producer: ProducerId,
    group: BusGroupId,
    bus: BusId,
  ): GlobalBusKey {
    return `${producer}:${group}:${bus}` as GlobalBusKey;
  }

  static fromAddress(key: GlobalBusAddress): GlobalBusKey {
    if (key.group != null) {
      return BusTools.fromGroupedParts(key.producer, key.group, key.bus);
    }
    return BusTools.fromParts(key.producer, key.bus);
  }

  static toAddress(key: GlobalBusKey): GlobalBusAddress {
    const parts = key.split(":");
    if (parts.length === 3) {
      return { producer: parts[0], group: parts[1], bus: parts[2] };
    }
    return { producer: parts[0], bus: parts[1] };
  }

  static infoFromState(state: SourceBusState): SourceBusInfo {
    return { id: state.id, name: state.name };
  }

  static stateFromInfo(
    info: SourceBusInfo,
    sources: Set<GlobalSourceKey>,
  ): SourceBusState {
    return { ...info, sources };
  }

  static infoMapFromStateMap(stateMap: BusStateMap): BusInfoMap {
    const infoMap: BusInfoMap = new Map();
    for (const [key, state] of stateMap) {
      infoMap.set(key, this.infoFromState(state));
    }
    return infoMap;
  }

  //? Bus Equals
  static areBusInfoEqual(a: SourceBusInfo, b: SourceBusInfo): boolean {
    if (a.name.long !== b.name.long) return false;
    if (a.name.short !== b.name.short) return false;

    if (a.id !== b.id) return false;

    return true;
  }

  static areSourceSetsEqual(
    a: Set<GlobalSourceKey>,
    b: Set<GlobalSourceKey>,
  ): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  static areSourceBusStatesEqual(
    a: SourceBusState,
    b: SourceBusState,
    onlySources: boolean = true,
  ): boolean {
    if (!onlySources) {
      if (!this.areBusInfoEqual(a, b)) return false;
    }

    if (!this.areSourceSetsEqual(a.sources, b.sources)) return false;

    return true;
  }

  static areBusInfoMapsEqual(a: BusInfoMap, b: BusInfoMap): boolean {
    if (a.size !== b.size) return false;

    for (const [key, busInfo] of a) {
      const otherBusInfo = b.get(key);
      if (!otherBusInfo) return false;
      if (!this.areBusInfoEqual(busInfo, otherBusInfo)) return false;
    }

    return true;
  }

  static areBusStateMapsEqual(
    a: BusStateMap,
    b: BusStateMap,
    onlySources: boolean = true,
  ): boolean {
    if (a.size !== b.size) return false;

    for (const [key, bus] of a) {
      const otherBus = b.get(key);
      if (!otherBus) return false;
      if (!this.areSourceBusStatesEqual(bus, otherBus, onlySources))
        return false;
    }

    return true;
  }

  static areProducerBusStatesEqual(
    a: ProducerBusState,
    b: ProducerBusState,
    onlySources: boolean = true,
  ): boolean {
    if (!onlySources) {
      if (a.state !== b.state) return false;
    }

    return this.areBusStateMapsEqual(a.busses, b.busses, onlySources);
  }

  static areGlobalProducerMapsEqual(
    a: GlobalProducerMap,
    b: GlobalProducerMap,
    onlySources: boolean = true,
  ): boolean {
    if (a.size !== b.size) return false;
    for (const [producer, busState] of a) {
      const otherBusState = b.get(producer);
      if (!otherBusState) return false;
      if (!this.areProducerBusStatesEqual(busState, otherBusState, onlySources))
        return false;
    }

    return true;
  }
}
