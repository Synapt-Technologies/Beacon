import type { DeviceTallyState } from "./DeviceTypes";
import type { ProducerId } from "./ProducerTypes";
import type { SourceInfo, SourceBus } from "./SourceTypes";

export interface TallyContext {
  newbus: SourceBus;
  oldbus: SourceBus;
  disconnectedProducers: Set<ProducerId>;
  disconnectedState: DeviceTallyState;
}

export interface SimpleBusNode {
  readonly type: "SimpleBusNode";
  sources: SourceInfo[];
}

export type PatchNode = SimpleBusNode;

export abstract class LogicFactory {
  static createSimpleBusNode(sources: SourceInfo[] = []): SimpleBusNode {
    return {
      type: "SimpleBusNode",
      sources: sources,
    };
  }
}
