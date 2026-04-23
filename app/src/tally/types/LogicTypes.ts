import type { DeviceTallyState } from "./DeviceTypes";
import type { ProducerId } from "./ProducerTypes";
import type { GlobalSource, SourceBus } from "./SourceTypes";


export interface TallyContext {
    newbus: SourceBus;
    oldbus: SourceBus;
    disconnectedProducers: Set<ProducerId>;
    disconnectedState: DeviceTallyState;
}



export class SimpleBusNode {
    readonly type = 'SimpleBusNode' as const;
    
    constructor(public sources: GlobalSource[]) {}
}

export type PatchNode = SimpleBusNode;