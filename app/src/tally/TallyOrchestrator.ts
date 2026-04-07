import { EventEmitter } from "events";
import { AbstractConsumer } from "./consumer/AbstractConsumer";
import { AedesNetworkConsumer } from "./consumer/networkConsumer/AedesNetworkConsumer";
import { GlobalSourceTools, type ProducerId, type TallyState } from "./types/ProducerStates";
import { AbstractTallyProducer, type ProducerInfo } from "./producer/AbstractTallyProducer";
import { AtemNetClientTallyProducer } from "./producer/networkProducer/AtemNetClientTallyProducer";
import { DeviceTallyState, type ConsumerId, type TallyDevice } from "./types/ConsumerStates";
import { Logger } from "../logging/Logger";


export interface OrchestratorConfig {
    state_on_disconnect?: DeviceTallyState;
}


export interface OrchestratorEvents {
    producer_added: [producer: ProducerId, info: ProducerInfo]
    producer_removed: [producer: ProducerId];
    producer_connected: [producer: ProducerId];
    producer_disconnected: [producer: ProducerId];
    producer_info: [info: ProducerInfo];

    consumer_added: [consumer: ConsumerId];
    consumer_removed: [consumer: ConsumerId];

    device_connected: [device: TallyDevice];
    device_info: [device: TallyDevice];
}

export class TallyOrchestrator extends EventEmitter<OrchestratorEvents> {

    protected logger: Logger;
    
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

        this.logger = new Logger([
            TallyOrchestrator.name
        ]);

        this.checkConfig(this.config);
        

        // TODO Add set tally off / alert (setting) on switcher disconnect!
    }

    protected checkConfig(config: OrchestratorConfig){

    }

    addConsumer(consumer: AbstractConsumer): void {
        this.consumers.set(consumer.getId(), consumer);
        this.emit('consumer_added', consumer.getId());
        this._parseGlobalTally();
    }

    removeConsumer(id: ConsumerId): void {
        const consumer = this.consumers.get(id);
        if (!consumer) {
            this.logger.warn(`Attempted to remove unknown consumer:`, id);
            return;
        }
        consumer.destroy();
        this.consumers.delete(id);
        this.emit('consumer_removed', id);
    }

    addProducer(producer: AbstractTallyProducer): void {
        this.producers.set(producer.getId(), producer);
        this.emit('producer_added', producer.getId(), producer.getInfo());

        producer.on('tally_update', (newState: TallyState) => {
            this.producerTallyStates.set(producer.getId(), newState);
            this._parseGlobalTally();
        });

        producer.on('disconnected', () => {
            this.producerTallyStates.delete(producer.getId());
            this._parseGlobalTally();
        });
    }

    removeProducer(id: ProducerId): void {
        const producer = this.producers.get(id);
        if (!producer) {
            this.logger.warn(`Attempted to remove unknown producer:`, id);
        } else {
            producer.destroy();
            this.producers.delete(id);
        }
        this.producerTallyStates.delete(id);
        this.emit('producer_removed', id);
        this._parseGlobalTally();
    }

    private _parseGlobalTally() {
        const newGlobalTally: Required<TallyState> = {
            moment: 0,
            program: new Set(),
            preview: new Set(),
        }

        for (const state of this.producerTallyStates.values()) {
            if (!state.moment || state.moment == 0)
                continue;
            
            state.program.forEach(source => newGlobalTally.program.add(source));
            state.preview.forEach(source => newGlobalTally.preview.add(source));
            
            if (state.moment && state.moment > newGlobalTally.moment )
                newGlobalTally.moment = state.moment;
        }

        if (newGlobalTally.moment == 0){
            this.logger.warn(`Did not set tally, because of invalid payload. Might be due to init. Global Tally:`, GlobalSourceTools.serialize(newGlobalTally));
            return;
        }


        this.logger.debug("Tally update:", GlobalSourceTools.serialize(newGlobalTally));

        this.globalTallyState = newGlobalTally;

        for (const consumer of this.consumers.values()) {
            consumer.consumeTally(this.globalTallyState);
        }
    }

    hasProducer(id: ProducerId): boolean {
        return this.producers.has(id);
    }

    hasConsumer(id: ConsumerId): boolean {
        return this.consumers.has(id);
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