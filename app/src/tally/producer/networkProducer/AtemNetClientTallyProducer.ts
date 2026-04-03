import { Atem, type AtemState } from "atem-connection";
import { AbstractNetClientTallyProducer, type NetClientProducerConfig, type NetClientProducerInfo } from "./AbstractNetClientTallyProducer";
import { Enums as AtemEnums, Input as AtemInput } from "atem-connection";
import { GlobalSourceTools, type SourceInfo, type SourceMap } from "../../types/ProducerStates";


export interface AtemNetClientProducerConfig extends NetClientProducerConfig {
    // me: number[] | null; //TODO
}

export interface AtemNetClientProducerInfo extends NetClientProducerInfo {
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

    protected declare info: AtemNetClientProducerInfo;

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
            this.info.state = this.atem.state ?? null; // TODO: Add more state checking for this.
            this.info.model = this._parseModel();

            this.emit('connected');
            this.logger.info("Connected to model:", this.getModel());
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
            
            // TODO: Add AUX support and check if this fully covers. Maybe startswith?
            if (pathToChange.some(p => p.includes('video.mixEffects') || p.includes('video.downstreamKeyers'))) {
                this._parseTallystate();
            }

            // TODO: add check for path
            // TODO: Change the way unkown is stored and checked.
            if (!this.info.model || this.info.model === "UNKNOWN") {
                this.info.model = this._parseModel();
                infoChange = true;
                this.logger.info(`Updated model:`, this.info.sources);
            }       

            // TODO: check if this fully covers.
            if (!this.info.sources || pathToChange.some(p => p.includes('inputs'))) {
                this.info.sources = this._parseSources();
                infoChange = true;
                this.logger.info(`Updated sources:`, this.info.sources);
            }

            if (infoChange)
                this.emit('info_update', this.info, pathToChange) 
        })
    }

    protected checkConfig(config: AtemNetClientProducerConfig) {
        super.checkConfig(config);
    }

    

    async init(): Promise<void> {
        await this.connect();
    }

    destroy(): Promise<void> {
        this.disconnect();
        return this.atem.destroy();
    }

    connect(): Promise<void> {
        return this.atem.connect(this.config.host);
    }
    disconnect(): Promise<void> {
        return this.atem.disconnect();
    }

    protected _parseTallystate(): void { 
            
        this.tallyState.update_moment = Date.now();
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

        const newTallyState = {
            update_moment: this.tallyState.update_moment,
            program: new Set<string>(newProgramStrings),
            preview: new Set<string>(newPreviewStrings)
        }

        if (!GlobalSourceTools.areTallyStatesEqual(this.tallyState, newTallyState)) {
            this.tallyState = newTallyState;
            
            this.emit("tally_update", this.tallyState);

            this.logger.debug("Tally Change:", GlobalSourceTools.serialize(this.tallyState));
        }
    }

    protected _parseModel(): string {
        if (!this.info.state || !this.info.state.info.model || !this.info.connected) {
            return this.info.model;
        } 
        return AtemEnums.Model[this.info.state.info.model];
    }

    protected _parseSources(): SourceMap {
        const sources = new Map();
        
        if (!this.info.state || !this.info.connected) 
            return sources;

        const getLabel = (id: string, label: string) => {
            if (label) return label;
            if (id === '0') return 'BLK';
            if (id === '1000') return 'BARS';
            return id;
        }


        for (const [id, input] of Object.entries(this.info.state.inputs)) {
            if (!input) continue;

            const globalKey = GlobalSourceTools.create(this.config.id, id);
            
            sources.set(globalKey, {
                source: { producer: this.config.id, source: id },
                // Use the raw 'id' for the fallback labels, not the globalKey
                short: getLabel(id, input.shortName) || `${id}`,
                long: getLabel(id, input.longName) || `Input ${id}`,
            });
        }
        
        return sources;

    }

    getModel(): string {
        return this.info.model;
    }
    
}
