import type { TallyState } from "./CommonTypes";
import type { ProducerId } from "./ProducerTypes";
import type { BusGroupStateMap, GlobalSourceAddress } from "./SourceTypes";

export interface TallyContext {
  newBus: BusGroupStateMap;
  oldBus: BusGroupStateMap;
  disconnectedProducers: Set<ProducerId>;
  disconnectedState: TallyState;
}

export interface SimpleBusNode {
  readonly type: "SimpleBusNode";
  sources: GlobalSourceAddress[];
}

export type PatchNode = SimpleBusNode;

export abstract class LogicFactory {
  static createSimpleBusNode(
    sources: GlobalSourceAddress[] = [],
  ): SimpleBusNode {
    return {
      type: "SimpleBusNode",
      sources: sources,
    };
  }
}
