import { CommonTools, TallyState, type DisplayName } from "./CommonTypes";
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

// TODO: Add Source availability? Which busses can display this source?
export interface SourceInfo {
  id: GlobalSourceAddress;
  name: DisplayName;
}

export type SourceSet = Set<GlobalSourceKey>;
export type SourceMap = Map<GlobalSourceKey, SourceInfo>; // Not a set, because it wont work on the SourceInfo object.

export type SourceStateMap = Map<GlobalSourceKey, TallyState>; // Used to broadcast state with IBroadcastConsumer for quick lookup.
export type SourceStateBusGroupMap = Map<GlobalBusGroupKey, SourceStateMap>; // TODO: Use in IBroadcastConsumer to enable the user to select which busses to display somehow?

// ? Busses
export interface GlobalBusGroupAddress {
  producer: ProducerId;
  group: BusGroupId;
}

export interface GlobalBusAddress extends GlobalBusGroupAddress {
  bus: BusId;
}

export interface BusLogicConfig {
  state: TallyState;
  enabled: boolean;
}

export interface SourceBusInfo {
  id: GlobalBusAddress;
  name: DisplayName;
  index: number; // For ordering busses in the UI.
  defaultLogic?: BusLogicConfig; // Optional default logic config for sources on this bus. Is overridden by user config.
}

export interface SourceBusState extends SourceBusInfo {
  sources: SourceSet;
}
export type BusInfoMap = Map<GlobalBusKey, SourceBusInfo>;
export type BusStateMap = Map<GlobalBusKey, SourceBusState>;
export type BusDefaultLogicMap = Map<GlobalBusKey, BusLogicConfig>;

// ? Bus Groups
export interface SourceBusGroup {
  id: GlobalBusGroupAddress;
  name: DisplayName;
  index: number; // For ordering groups in the UI.
}

export interface SourceBusGroupInfo extends SourceBusGroup {
  busses: BusInfoMap;
}

export interface SourceBusGroupState extends SourceBusGroup {
  busses: BusStateMap;
}

// TODO: Maybe add a map type with only the nested bus state map, without the info?

// ? Bus Maps
export type BusGroupInfoMap = Map<GlobalBusGroupKey, SourceBusGroupInfo>;
export type BusGroupStateMap = Map<GlobalBusGroupKey, SourceBusGroupState>;

export interface ProducerBusState extends ProducerState {
  busGroups: BusGroupStateMap;
}

export type GlobalProducerMap = Map<ProducerId, ProducerBusState>;

// TODO: Add an interface to map Busses to colors or select which busses to display?

export abstract class SourceTools {
  //? Source Address
  static fromParts(producer: ProducerId, source: SourceId): GlobalSourceKey {
    return `${producer}:${source}` as GlobalSourceKey;
  }

  static fromAddress(key: GlobalSourceAddress): GlobalSourceKey {
    return this.fromParts(key.producer, key.source);
  }

  static toAddress(key: GlobalSourceKey): GlobalSourceAddress {
    const [producer, ...sourceParts] = key.split(":");
    return { producer, source: sourceParts.join(":") };
  }

  static areSourceAddressesEqual(
    a: GlobalSourceAddress,
    b: GlobalSourceAddress,
  ): boolean {
    return a.producer === b.producer && a.source === b.source;
  }

  static areSourceInfoEqual(a: SourceInfo, b: SourceInfo): boolean {
    if (!this.areSourceAddressesEqual(a.id, b.id)) return false;
    if (!CommonTools.areDisplayNamesEqual(a.name, b.name)) return false;

    return true;
  }

  static areSourceSetsEqual(a: SourceSet, b: SourceSet): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  static areSourceMapsEqual(a: SourceMap, b: SourceMap): boolean {
    if (a.size !== b.size) return false;
    for (const [key, sourceInfo] of a) {
      const otherSourceInfo = b.get(key);
      if (!otherSourceInfo) return false;
      if (!this.areSourceInfoEqual(sourceInfo, otherSourceInfo)) return false;
    }
    return true;
  }
}
export abstract class BusTools {
  //? Source Bus
  static groupFromParts(
    producer: ProducerId,
    group: BusGroupId,
  ): GlobalBusGroupKey {
    return `${producer}:${group}` as GlobalBusGroupKey;
  }

  static busFromParts(
    producer: ProducerId,
    group: BusGroupId,
    bus: BusId,
  ): GlobalBusKey {
    return `${this.groupFromParts(producer, group)}:${bus}` as GlobalBusKey;
  }

  static groupFromAddress(key: GlobalBusGroupAddress): GlobalBusGroupKey {
    return this.groupFromParts(key.producer, key.group);
  }

  static busFromAddress(key: GlobalBusAddress): GlobalBusKey {
    return this.busFromParts(key.producer, key.group, key.bus);
  }

  static groupToAddress(key: GlobalBusGroupKey): GlobalBusGroupAddress {
    const [producer, group] = key.split(":");
    return { producer, group };
  }

  static busToAddress(key: GlobalBusKey): GlobalBusAddress {
    const parts = key.split(":");
    return { producer: parts[0], group: parts[1], bus: parts[2] };
  }

  static busInfoFromState(state: SourceBusState): SourceBusInfo {
    return {
      id: state.id,
      name: state.name,
      index: state.index,
      defaultLogic: state.defaultLogic,
    };
  }

  static busStateFromInfo(
    info: SourceBusInfo,
    sources: SourceSet,
  ): SourceBusState {
    return { ...info, sources };
  }

  static busDefaultLogic(info: SourceBusInfo): BusLogicConfig {
    return {
      state: TallyState.NONE,
      enabled: false,
      ...info.defaultLogic,
    };
  }

  static groupInfoFromState(state: SourceBusGroupState): SourceBusGroupInfo {
    return {
      id: state.id,
      name: state.name,
      index: state.index,
      busses: this.busInfoMapFromStateMap(state.busses),
    };
  }

  static groupStateFromGroup(
    group: SourceBusGroup,
    busses: BusStateMap,
  ): SourceBusGroupState {
    return { ...group, busses };
  }

  static groupInfoFromGroup(
    group: SourceBusGroup,
    busses: BusInfoMap,
  ): SourceBusGroupInfo {
    return { ...group, busses };
  }

  static busInfoMapFromStateMap(stateMap: BusStateMap): BusInfoMap {
    const infoMap: BusInfoMap = new Map();
    for (const [key, state] of stateMap) {
      infoMap.set(key, this.busInfoFromState(state));
    }
    return infoMap;
  }

  static busDefaultLogicMapFromBusMap(
    map: BusInfoMap | BusStateMap,
  ): BusDefaultLogicMap {
    const defaultLogicMap: BusDefaultLogicMap = new Map();
    for (const [key, info] of map) {
      defaultLogicMap.set(key, this.busDefaultLogic(info));
    }
    return defaultLogicMap;
  }

  static groupInfoMapFromStateMap(stateMap: BusGroupStateMap): BusGroupInfoMap {
    const infoMap: BusGroupInfoMap = new Map();
    for (const [key, state] of stateMap) {
      infoMap.set(key, this.groupInfoFromState(state));
    }
    return infoMap;
  }

  static busDefaultLogicMapFromGroupMap(
    map: BusGroupInfoMap | BusGroupStateMap,
  ): BusDefaultLogicMap {
    const defaultLogicMap: BusDefaultLogicMap = new Map();
    for (const [_key, group] of map) {
      for (const [busKey, defaultState] of this.busDefaultLogicMapFromBusMap(
        group.busses,
      )) {
        defaultLogicMap.set(busKey, defaultState);
      }
    }
    return defaultLogicMap;
  }

  //? Bus Equals
  static areBusGroupAddressEqual(
    a: GlobalBusGroupAddress,
    b: GlobalBusGroupAddress,
  ): boolean {
    return a.producer === b.producer && a.group === b.group;
  }

  static areBusAddressEqual(a: GlobalBusAddress, b: GlobalBusAddress): boolean {
    return this.areBusGroupAddressEqual(a, b) && a.bus === b.bus;
  }

  static areBusInfoEqual(a: SourceBusInfo, b: SourceBusInfo): boolean {
    if (!this.areBusAddressEqual(a.id, b.id)) return false;
    if (!CommonTools.areDisplayNamesEqual(a.name, b.name)) return false;
    if (a.index !== b.index) return false;
    if (a.defaultLogic?.state !== b.defaultLogic?.state) return false;
    if (a.defaultLogic?.enabled !== b.defaultLogic?.enabled) return false;

    return true;
  }

  static areBusStateEqual(a: SourceBusState, b: SourceBusState): boolean {
    if (!this.areBusInfoEqual(a, b)) return false;
    if (!SourceTools.areSourceSetsEqual(a.sources, b.sources)) return false;

    return true;
  }

  static areBusInfoMapEqual(a: BusInfoMap, b: BusInfoMap): boolean {
    if (a.size !== b.size) return false;

    for (const [key, busInfo] of a) {
      const otherBusInfo = b.get(key);
      if (!otherBusInfo) return false;
      if (!this.areBusInfoEqual(busInfo, otherBusInfo)) return false;
    }

    return true;
  }

  static areBusStateMapEqual(a: BusStateMap, b: BusStateMap): boolean {
    if (a.size !== b.size) return false;

    for (const [key, bus] of a) {
      const otherBus = b.get(key);
      if (!otherBus) return false;
      if (!this.areBusStateEqual(bus, otherBus)) return false;
    }

    return true;
  }

  static areGroupEqual(a: SourceBusGroup, b: SourceBusGroup): boolean {
    if (!this.areBusGroupAddressEqual(a.id, b.id)) return false;
    if (!CommonTools.areDisplayNamesEqual(a.name, b.name)) return false;
    if (a.index !== b.index) return false;

    return true;
  }

  static areGroupInfoEqual(
    a: SourceBusGroupInfo,
    b: SourceBusGroupInfo,
  ): boolean {
    if (!this.areGroupEqual(a, b)) return false;
    if (!this.areBusInfoMapEqual(a.busses, b.busses)) return false;

    return true;
  }

  static areGroupStateEqual(
    a: SourceBusGroupState,
    b: SourceBusGroupState,
  ): boolean {
    if (!this.areGroupEqual(a, b)) return false;
    if (!this.areBusStateMapEqual(a.busses, b.busses)) return false;

    return true;
  }

  static areGroupInfoMapEqual(a: BusGroupInfoMap, b: BusGroupInfoMap): boolean {
    if (a.size !== b.size) return false;

    for (const [key, groupInfo] of a) {
      const otherGroupInfo = b.get(key);
      if (!otherGroupInfo) return false;
      if (!this.areGroupInfoEqual(groupInfo, otherGroupInfo)) return false;
    }

    return true;
  }

  static areGroupStateMapEqual(
    a: BusGroupStateMap,
    b: BusGroupStateMap,
  ): boolean {
    if (a.size !== b.size) return false;

    for (const [key, groupState] of a) {
      const otherGroupState = b.get(key);
      if (!otherGroupState) return false;
      if (!this.areGroupStateEqual(groupState, otherGroupState)) return false;
    }

    return true;
  }

  static areProducerBusStateEqual(
    a: ProducerBusState,
    b: ProducerBusState,
  ): boolean {
    if (a.state !== b.state) return false;
    if (!this.areGroupStateMapEqual(a.busGroups, b.busGroups)) return false;

    return true;
  }

  static areGlobalProducerMapEqual(
    a: GlobalProducerMap,
    b: GlobalProducerMap,
  ): boolean {
    if (a.size !== b.size) return false;
    for (const [producer, busState] of a) {
      const otherBusState = b.get(producer);
      if (!otherBusState) return false;
      if (!this.areProducerBusStateEqual(busState, otherBusState)) return false;
    }

    return true;
  }
}
