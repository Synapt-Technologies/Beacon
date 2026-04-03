import { EventEmitter } from "events";
import { AbstractConsumer } from "./consumer/AbstractConsumer";
import { AedesNetworkConsumer } from "./consumer/networkConsumer/AedesNetworkConsumer";
import type { ProducerId, TallyState } from "./types/ProducerStates";
import { AbstractTallyProducer, type ProducerInfo } from "./producer/AbstractTallyProducer";
import { AtemNetClientTallyProducer } from "./producer/networkProducer/AtemNetClientTallyProducer";
import { DeviceTallyState, type ConsumerId, type TallyDevice } from "./types/ConsumerStates";


export interface OrchestratorConfig {
    state_on_disconnect?: DeviceTallyState;
}


export interface OrchestratorEvents {
    producer_added: [producer: ProducerId, info: ProducerInfo]
    producer_connected: [producer: ProducerId];
    producer_disconnected: [producer: ProducerId];
    producer_info: [info: ProducerInfo];

    consumer_added: [consumer: ConsumerId];

    device_connected: [device: TallyDevice];
    device_info: [device: TallyDevice];
}

export class TallyOrchestrator extends EventEmitter<OrchestratorEvents> {

    public static readonly name: string = "Orchestrator";
    
    protected config: Required<OrchestratorConfig>;

    public static readonly DefaultConfig: Required<OrchestratorConfig> = {
        state_on_disconnect: DeviceTallyState.NONE,
    };


    private producers: Map<string, AbstractTallyProducer> = new Map();
    private consumers: Map<string, AbstractConsumer> = new Map();

    private producerTallyStates: Map<string, TallyState> = new Map();
    private globalTallyState: TallyState = {
        preview: new Set(),
        program: new Set()
    }


    constructor(config: OrchestratorConfig) {
        super();
        this.config = { ...TallyOrchestrator.DefaultConfig, ...config };

        this.checkConfig(this.config);
        
        const testAedes = new AedesNetworkConsumer({
            name: "AEDES", // TODO refactor default names, maybe also make it return e.g. Atem@192.168.10.240
            parent: TallyOrchestrator.name,
            keep_alive_ms: 5000,
            broadcast_all: true,
            id: "aedes"
        });

        testAedes.init();
        
        this.addConsumer(testAedes);

        const testAtem = new AtemNetClientTallyProducer({
            name: "ATEM-TVSHD",
            parent: TallyOrchestrator.name,
            host: "127.0.0.1",
            id: "atem1"
        });

        testAtem.init();

        this.addProducer(testAtem);


        // TODO Add set tally off / alert (setting) on switcher disconnect!
    }

    protected checkConfig(config: OrchestratorConfig){

    }

    async addConsumer(consumer: AbstractConsumer) {

        this.consumers.set(consumer.getId(), consumer);

        this._parseGlobalTally();
    }

    async addProducer(producer: AbstractTallyProducer) {

        this.producers.set(producer.getId(), producer);

        producer.on('tally_update', (newState: TallyState) => {
            this.producerTallyStates.set(producer.getId(), newState);
            this._parseGlobalTally();
        });
    }

    private _parseGlobalTally() {
        const newGlobalTally: TallyState = {
            program: new Set(),
            preview: new Set(),
        }

        for (const state of this.producerTallyStates.values()) {
            state.program.forEach(source => newGlobalTally.program.add(source));
            state.preview.forEach(source => newGlobalTally.preview.add(source));
        }

        this.globalTallyState = newGlobalTally;

        for (const consumer of this.consumers.values()) {
            consumer.consumeTally(this.globalTallyState);
        }
    }

    getDevices(): Map<ConsumerId, Array<TallyDevice>> {
        const output = new Map();

        this.consumers.forEach(consumer => {
            const devices = consumer.getAvailableDevices();

            output.set(consumer.getId(), devices);
        });

        return output;
    }
       
}