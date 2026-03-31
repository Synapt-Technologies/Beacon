import { EventEmitter } from "events";
import { AbstractTallyConsumer } from "./consumer/AbstractTallyConsumer";
import { AedesNetworkTallyConsumer } from "./consumer/networkConsumer/AedesNetworkTallyConsumer";
import { TallyState } from "./types/TallyState";
import { AbstractTallyProducer, ProducerTallyState } from "./producer/AbstractTallyProducer";
import { AtemNetClientTallyProducer } from "./producer/networkProducer/AtemNetClientTallyProducer";


export interface OrchestratorConfig {
    name: string;
}


export interface OrchestratorEvents {
    tally_update: [];
    producer_connected: [];
    producer_disconnected: [];
    producer_info: [];
}

// TODO: Multithreaded?
// TODO: Multiple switcher connections?
// TODO: Multiple event servers?
export class TallyOrchestrator extends EventEmitter<OrchestratorEvents> {

    private config: Required<OrchestratorConfig>;

    public static readonly DefaultConfig: Required<OrchestratorConfig> = {
        name: "Beacon Server"
    };

    private mainProducer: AbstractTallyProducer;
    private auxProducers: Map<string, AbstractTallyProducer> = new Map();

    private consumers: Map<string, AbstractTallyConsumer> = new Map();
    private tallyConsumer: AbstractTallyConsumer;


    private lightState: TallyState = {
        alert: [],
        program: [],
        preview: []
    };

    constructor(config: OrchestratorConfig) {
        super();
        this.config = { ...TallyOrchestrator.DefaultConfig, ...config };

        this.checkConfig(this.config);

        this.mainProducer = new AtemNetClientTallyProducer({
            name: "ATEM1", // TODO refactor default names, maybe also make it return e.g. Atem@192.168.10.240
            parent: this.config.name,
            host: "127.0.0.1"
        });

        this.tallyConsumer = new AedesNetworkTallyConsumer({
            name: "AEDES", // TODO refactor default names, maybe also make it return e.g. Atem@192.168.10.240
            parent: this.config.name,
            keep_alive_ms: 5000 // TODO: Make a mode to prevent network congestion with low or no keep alive?
        });

        this.mainProducer.on('tally_update', (tallydata: ProducerTallyState) => {
        
            this.lightState = {
                alert: [],
                program: tallydata.program,
                preview: tallydata.preview
            }
        
            this.tallyConsumer.consumeTally(this.lightState);
        });

        // TODO Add set tally off / alert (setting) on switcher disconnect!

        this.tallyConsumer.on('subscribe', () => {
            this.tallyConsumer.consumeTally(this.lightState);
        });
    }
    
    async init() {

        await this.tallyConsumer.init();
        await this.mainProducer.init();
    }

    protected checkConfig(config: OrchestratorConfig){

    }
    
}