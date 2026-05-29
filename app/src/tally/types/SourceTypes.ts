import type { DisplayName } from "./CommonTypes";
import type { ProducerId, ProducerState } from "./ProducerTypes";

export type BusId = string;
export type BusGroupId = string;
// TODO: Colon sanitization, some producers might contain colons in their names. Be it due to the source type, or them allowing user defined keys.
export type SourceId = string;

export type GlobalSourceKey = `${ProducerId}:${SourceId}`;
// TODO: Colon sanitization, some producers might contain colons in their names. Be it due to the source type, or them allowing user defined keys.
export type GlobalBusKey =
  | `${ProducerId}:${BusId}`
  | `${ProducerId}:${BusGroupId}:${BusId}`;

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
  group?: BusGroupId;
  bus: BusId;
}

export interface SourceBusInfo {
  id: GlobalBusKey;
  name: DisplayName;
}

export interface SourceBusState extends SourceBusInfo {
  sources: Set<GlobalSourceKey>;
}

// ? Bus Maps
export type BusInfoMap = Map<GlobalBusKey, SourceBusInfo>;
export type BusStateMap = Map<GlobalBusKey, SourceBusState>;

export interface ProducerBusState extends ProducerState {
  busses: BusStateMap;
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

  static stateFromInfo(info: SourceBusInfo, sources: Set<GlobalSourceKey>): SourceBusState {
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

  static areSourceBussesEqual(
    a: SourceBusState,
    b: SourceBusState,
    onlySources: boolean = true,
  ): boolean {
    if (!onlySources) {
      if (a.name.long !== b.name.long) return false;
      if (a.name.short !== b.name.short) return false;

      if (a.id !== b.id) return false;
    }

    if (!this.areSourceSetsEqual(a.sources, b.sources)) return false;

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
      if (!this.areSourceBussesEqual(bus, otherBus, onlySources)) return false;
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
