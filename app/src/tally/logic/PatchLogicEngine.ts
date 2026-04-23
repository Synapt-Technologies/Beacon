import { DeviceTallyState } from "../types/DeviceTypes";
import type { PatchNode, SimpleBusNode } from "../types/LogicTypes";
import { GlobalSourceDto, type SourceBus } from "../types/SourceTypes";


export class PatchLogicEngine {
    evaluate(node: PatchNode, newbus: SourceBus, oldbus: SourceBus): DeviceTallyState {
        switch (node.type) {
            case 'SimpleBusNode': return this.evalSimple(node, newbus, oldbus);
        }
    }

    private evalSimple(node: SimpleBusNode, newbus: SourceBus, oldbus: SourceBus): DeviceTallyState {
        const keys = node.sources.map(s => GlobalSourceDto.from(s).toKey());
        if (keys.some(k => newbus.program.has(k))) return DeviceTallyState.PROGRAM;
        if (keys.some(k => newbus.preview.has(k))) return DeviceTallyState.PREVIEW;
        return DeviceTallyState.NONE;
    }
}