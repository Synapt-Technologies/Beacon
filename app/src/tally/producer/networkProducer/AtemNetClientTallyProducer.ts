import { Atem, type AtemState } from "atem-connection";
import { AbstractNetClientTallyProducer, type NetClientProducerConfig, type NetClientProducerInfo } from "./AbstractNetClientTallyProducer";
import { Enums as AtemEnums } from "atem-connection";
import { GlobalSourceTools, type ProducerModel, type SourceInfo, type SourceMap, type TallyState } from "../../types/ProducerStates";


export interface AtemNetClientProducerConfig extends NetClientProducerConfig {
    // me: number[] | null; //TODO
}

interface AtemNetClientProducerInfo extends NetClientProducerInfo {
}
export interface AtemNetClientProducerInfoInternal extends NetClientProducerInfo {
    state: AtemState | null;
}

// TODO: Maybe add config type as generic for better TS: C extends ProducerConfig = ProducerConfig,
export class AtemNetClientTallyProducer extends AbstractNetClientTallyProducer {

    protected declare config: Required<AtemNetClientProducerConfig>; // Declare to indicate it overwrites the parent's type.
    
    public static readonly DefaultConfig: Required<AtemNetClientProducerConfig> = {
        ...AbstractNetClientTallyProducer.DefaultConfig,
        name: "Atem",
        port: 9910
    };
    
    protected getDefaultConfig(): Required<AtemNetClientProducerConfig> {
        return AtemNetClientTallyProducer.DefaultConfig;
    }

    private atem: Atem;

    protected declare info: AtemNetClientProducerInfoInternal;  // TODO make partial?

    constructor(config: AtemNetClientProducerConfig) {
        super(config);

        this.atem = new Atem({
            address: config.host,
            port: config.port
        });

        this.atem.on('info', (data) => {
            this.logger.debug("Info:", data);
        });
        this.atem.on('error', (data) => {
            this.logger.error("Error:", data);
        });

        this.atem.on('connected', () => {
            this.info.connected = true;
            this.info.update_moment = Date.now();
            this.info.state = this.atem.state ?? null;
            this.info.model =  this._parseModel();
            this.info.sources = this._parseSources();

            this.emit('connected');
            this.logger.info("Connected to model:", this.getModel());
            this.emitInfoUpdate();
            this._parseTallystate();
        })

        this.atem.on('disconnected', () => {
            this.info.connected = false;
            this.info.update_moment = Date.now();
            this.info.state = null;
            this.emit('disconnected');
            this.logger.warn("Disconnected");
            this._parseTallystate();
        })

        this.atem.on('stateChanged', (state, pathToChange) => {
            this.info.state = state;
            let infoChange: boolean = false;

            this.logger.debug("State Changed. Path:", pathToChange);

            // TODO: Add AUX support and check if this fully covers. Maybe startswith?
            if (pathToChange.some(p => p.includes('video.mixEffects') || p.includes('video.downstreamKeyers'))) {
                this._parseTallystate();
            }

            // TODO: add check for path
            // TODO: Change the way unkown is stored and checked.
            if (!this.info.model || this.info.model.short === "UNKNOWN") {
                this.info.model = this._parseModel();
                infoChange = true;
                this.logger.info(`Updated model:`, this.info.model);
            }

            // TODO: Doesn't full cover, sources are empty.
            if (!this.info.sources || this.info.sources.size == 0 || pathToChange.some(p => p.includes('inputs'))) {
                this.info.sources = this._parseSources();
                infoChange = true;
                this.logger.info(`Updated sources:`, this.info.sources);
            }

            if (infoChange)
                this.emitInfoUpdate();
        })
    }

    protected checkConfig(config: AtemNetClientProducerConfig) {
        super.checkConfig(config);
    }

    

    async init(): Promise<void> {
        await this.connect();
    }

    async destroy(): Promise<void> {
        await this.disconnect();
        await this.atem.destroy();
    }

    connect(): Promise<void> {
        return this.atem.connect(this.config.host);
    }
    disconnect(): Promise<void> {
        return this.atem.disconnect();
    }

    protected _parseTallystate(): void { 
            
        this.tallyState.moment = Date.now();
        let rawProgram: number[] = [];
        let rawPreview: number[] = [];
        
        if (this.info.connected){
            try {
                rawProgram = this.atem.listVisibleInputs("program");
                rawPreview = this.atem.listVisibleInputs("preview");
            }
            catch (e) {
                this.logger.error(`Failed to parse tally state:`, e); // TODO Check if this happens often and there should better be some timeout.
            }
        }


        // TODO Implement multi ME, and maybe even aux handling?
        const newProgramStrings = rawProgram.map(id => 
            GlobalSourceTools.create(this.config.id, String(id))
        );
        const newPreviewStrings = rawPreview.map(id => 
            GlobalSourceTools.create(this.config.id, String(id))
        );

        const newTallyState: TallyState = {
            moment: this.tallyState.moment,
            program: new Set<string>(newProgramStrings),
            preview: new Set<string>(newPreviewStrings)
        }

        if (!GlobalSourceTools.areTallyStatesEqual(this.tallyState, newTallyState)) {
            this.tallyState = newTallyState;
            
            this.emit("tally_update", this.tallyState);

            this.logger.debug("Tally Change:", GlobalSourceTools.serialize(this.tallyState));
        }
    }

    protected _parseModel(): ProducerModel {
        if (!this.info.state || !this.info.connected) {
            return this.info.model;
        } 
        return {
            short: AtemEnums.Model[this.info.state.info.model],
            long: this.info.state.info.productIdentifier,
        };
    }

    protected _parseSources(): SourceMap {
        let sources: SourceMap = new Map();

        if (!this.info.state || !this.info.connected){
            return sources;
        }

        for (const [id, input] of Object.entries(this.info.state.inputs)) {
            if (!input) continue;
            
            const globalKey = GlobalSourceTools.create(this.config.id, id);
            
            const sourceInfo: SourceInfo = {
                source: { producer: this.config.id, source: id },
                short: input.shortName || `${id}`,
                long: input.longName || `Input ${id}`,
            }

            // this.logger.debug(`Parsing source. ID: ${globalKey}, info:`, sourceInfo);
            
            sources.set(globalKey, sourceInfo);
        }
        
        return sources;

    }

}
