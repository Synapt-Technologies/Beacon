import { DeviceTallyState, type DeviceTallyPackage } from "../types/DeviceTypes";
import type { PatchNode, SimpleBusNode, TallyContext } from "../types/LogicTypes";
import type { ProducerId } from "../types/ProducerTypes";
import { GlobalSourceDto, type GlobalSourceKey, type SourceBus } from "../types/SourceTypes";


export class PatchLogicEngine {
    evaluate(node: PatchNode, context: TallyContext): DeviceTallyPackage {
        switch (node.type) {
            case 'SimpleBusNode': return this.evalSimple(node, context);
        }
    }

    // TODO: add active sources
    private evalSimple(node: SimpleBusNode, context: TallyContext): DeviceTallyPackage {
        const keys = node.sources.map(s => GlobalSourceDto.from(s).toKey());

        const programHits = new Set(keys.filter(k => context.newbus.program.has(k)));
        const previewHits = new Set(keys.filter(k => context.newbus.preview.has(k)));

        const activeSources: SourceBus = { program: programHits, preview: previewHits };

        let outputState: DeviceTallyState;

        if (programHits.size > 0) outputState = DeviceTallyState.PROGRAM;
        else if (previewHits.size > 0) outputState = DeviceTallyState.PREVIEW;
        else outputState = DeviceTallyState.NONE;

        for (const producer of this.collectProducers(node)) {
            if (context.disconnectedProducers.has(producer)) {
                outputState = context.disconnectedState;
                break;
            }
        }

        return { state: outputState, activeSources };
    }

    collectSources(node: PatchNode): Set<GlobalSourceKey> {
        switch (node.type) {
            case 'SimpleBusNode':
                return new Set(node.sources.map(s => GlobalSourceDto.from(s).toKey()));
            // future: case 'and'/'or': union of children
        }
    }

    collectProducers(node: PatchNode): Set<ProducerId> {
        switch (node.type) {
            case 'SimpleBusNode':
                return new Set(node.sources.map(s => GlobalSourceDto.from(s).producer));
            // future: case 'and'/'or': union of children
        }
    }
}