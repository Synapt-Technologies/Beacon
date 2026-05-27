import type { DeviceTallyState } from "./DeviceTypes";
import type { ProducerId } from "./ProducerTypes";
import type { GlobalSource, SourceBus } from "./SourceTypes";


export interface TallyContext {
    newbus: SourceBus;
    oldbus: SourceBus;
    disconnectedProducers: Set<ProducerId>;
    disconnectedState: DeviceTallyState;
}



export interface SimpleBusNode {
    readonly type: 'SimpleBusNode';
    sources: GlobalSource[];
}

export type PatchNode = SimpleBusNode;


export abstract class LogicFactory {
    static createSimpleBusNode(sources: GlobalSource[] = []): SimpleBusNode {
        return {
            type: 'SimpleBusNode',
            sources: sources,
        }
    }
}
