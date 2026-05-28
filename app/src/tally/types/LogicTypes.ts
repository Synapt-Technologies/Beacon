import type { DeviceTallyState } from "./DeviceTypes";
import type { ProducerId } from "./ProducerTypes";
import type { SourceBus, GlobalSourceAddress } from "./SourceTypes";

export interface TallyContext {
  newBus: SourceBus;
  oldBus: SourceBus;
  disconnectedProducers: Set<ProducerId>;
  disconnectedState: DeviceTallyState;
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
