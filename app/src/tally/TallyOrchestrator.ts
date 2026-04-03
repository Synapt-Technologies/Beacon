import { EventEmitter } from "events";
import { AbstractConsumer } from "./consumer/AbstractConsumer";
import { AedesNetworkConsumer } from "./consumer/networkConsumer/AedesNetworkConsumer";
import type { TallyState } from "./types/TallyState";
import { AbstractTallyProducer, type ProducerTallyState } from "./producer/AbstractTallyProducer";
import { AtemNetClientTallyProducer } from "./producer/networkProducer/AtemNetClientTallyProducer";


export interface OrchestratorConfig {
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

    public static readonly name: string = "Orchestrator";

    private config: Required<OrchestratorConfig>;

    public static readonly DefaultConfig: Required<OrchestratorConfig> = {
    };

    private mainProducer: AbstractTallyProducer;
    private auxProducers: Map<string, AbstractTallyProducer> = new Map();

    private consumers: Map<string, AbstractConsumer> = new Map();
    private consumer: AbstractConsumer;


    private lightState: TallyState = {
        program: new Set<string>(),
        preview: new Set<string>()
    };

    constructor(config: OrchestratorConfig) {
        super();
        this.config = { ...TallyOrchestrator.DefaultConfig, ...config };

        this.checkConfig(this.config);

        this.mainProducer = new AtemNetClientTallyProducer({
            name: "ATEM1", // TODO refactor default names, maybe also make it return e.g. Atem@192.168.10.240
            parent: TallyOrchestrator.name,
            host: "127.0.0.1",
            id: "atem1"
        });

        this.consumer = new AedesNetworkConsumer({
            name: "AEDES", // TODO refactor default names, maybe also make it return e.g. Atem@192.168.10.240
            parent: TallyOrchestrator.name,
            keep_alive_ms: 5000, // TODO: Make a mode to prevent network congestion with low or no keep alive?
            broadcast_all: true
        });

        this.mainProducer.on('tally_update', (tallydata: ProducerTallyState) => {
        
            this.lightState = {
                program: tallydata.program,
                preview: tallydata.preview
            }
        
            this.consumer.consumeTally(this.lightState);
        });

        // TODO Add set tally off / alert (setting) on switcher disconnect!

        this.consumer.on('subscribe', () => {
            this.consumer.consumeTally(this.lightState);
        });
    }
    
    async init() {

        await this.consumer.init();
        await this.mainProducer.init();
    }

    protected checkConfig(config: OrchestratorConfig){

    }
    
}