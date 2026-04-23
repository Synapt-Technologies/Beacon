import type { GlobalSource } from "./SourceTypes";

export class SimpleBusNode {
    readonly type = 'SimpleBusNode' as const;
    
    constructor(public sources: GlobalSource[]) {}
}

export type PatchNode = SimpleBusNode;