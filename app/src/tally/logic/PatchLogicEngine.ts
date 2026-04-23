import { DeviceTallyState, type DeviceTallyPackage } from "../types/DeviceTypes";
import type { PatchNode, SimpleBusNode } from "../types/LogicTypes";
import { GlobalSourceDto, type GlobalSourceKey, type SourceBus } from "../types/SourceTypes";


export class PatchLogicEngine {
    evaluate(node: PatchNode, newbus: SourceBus, oldbus: SourceBus): DeviceTallyPackage {
        switch (node.type) {
            case 'SimpleBusNode': return this.evalSimple(node, newbus, oldbus);
        }
    }

    // TODO: add active sources
    private evalSimple(node: SimpleBusNode, newbus: SourceBus, oldbus: SourceBus): DeviceTallyPackage {
        const keys = node.sources.map(s => GlobalSourceDto.from(s).toKey());

        const programHits = new Set(keys.filter(k => newbus.program.has(k)));
        const previewHits = new Set(keys.filter(k => newbus.preview.has(k)));

        const activeSources: SourceBus = { program: programHits, preview: previewHits };

        if (programHits.size > 0) return { state: DeviceTallyState.PROGRAM, activeSources };
        if (previewHits.size > 0) return { state: DeviceTallyState.PREVIEW, activeSources };
        return { state: DeviceTallyState.NONE, activeSources };
    }

    collectSources(node: PatchNode): Set<GlobalSourceKey> {
        switch (node.type) {
            case 'SimpleBusNode':
                return new Set(node.sources.map(s => GlobalSourceDto.from(s).toKey()));
            // future: case 'and'/'or': union of children
        }
    }
}