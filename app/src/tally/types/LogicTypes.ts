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

export interface OrNode {
  readonly type: "OrNode";
  nodes: PatchNode[];
}

export interface AndNode {
  readonly type: "AndNode";
  nodes: PatchNode[];
}

export type LogicNode = SimpleBusNode | OrNode | AndNode | NotNode | XorNode | BooleanNode | SourceListContainsNode;

export abstract class LogicFactory {
  static createSimpleBusNode(
    sources: GlobalSourceAddress[] = [],
  ): SimpleBusNode {
    return {
      type: "SimpleBusNode",
      sources: sources,
    };
  }

  static createOrNode(nodes: PatchNode[] = []): OrNode {
    return {
      type: "OrNode",
      nodes: nodes,
    };
  }

  static createAndNode(nodes: PatchNode[] = []): AndNode {
    return {
      type: "AndNode",
      nodes: nodes,
    };
  }
}
