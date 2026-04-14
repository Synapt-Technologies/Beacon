import { EventEmitter } from "events";
import { AbstractConsumer } from "./consumer/AbstractConsumer";
import { isGlobalBroadcastConsumer } from "./consumer/IGlobalBroadcastConsumer";
import { GlobalSourceTools, type ProducerId, type TallyState } from "./types/ProducerStates";
import { AbstractTallyProducer, type ProducerInfo } from "./producer/AbstractTallyProducer";
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


    private producers: Map<ProducerId, AbstractTallyProducer> = new Map();
    private consumers: Map<ConsumerId, AbstractConsumer> = new Map();

    private producerTallyStates: Map<ProducerId, TallyState> = new Map();
    private disconnectedProducers: Set<ProducerId> = new Set();
    private globalTallyState: TallyState = {
        preview: new Set(),
        program: new Set()
    }


    constructor(config: OrchestratorConfig) {
        super();
        this.config = { ...TallyOrchestrator.DefaultConfig, ...config };

        this.logger = new Logger(["Tally", "Orchestrator"]);

        this.checkConfig(this.config);
    }

    updateConfig(config: Partial<OrchestratorConfig>): void {
        this.config = { ...this.config, ...config };
    }

    protected checkConfig(config: OrchestratorConfig){

    }

    addConsumer(consumer: AbstractConsumer): void {
        this.consumers.set(consumer.getId(), consumer);
        consumer.on('device_update', (device: TallyDevice) => {
            this._notifyBroadcasters(consumer.getId(), device);
        });
        this.emit('consumer_added', consumer.getId());
        this._parseGlobalTally();
    }

    private _notifyBroadcasters(exclude: ConsumerId, device: TallyDevice): void {
        for (const [id, consumer] of this.consumers) {
            if (id === exclude) continue;
            if (isGlobalBroadcastConsumer(consumer)) {
                consumer.publishDeviceTally(device);
            }
        }
    }

    async removeConsumer(id: ConsumerId): Promise<void> {
        const consumer = this.consumers.get(id);
        if (!consumer) {
            this.logger.warn(`Attempted to remove unknown consumer:`, id);
            return;
        }
        await consumer.destroy();
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

        producer.on('connected', () => {
            this.disconnectedProducers.delete(producer.getId());
            this._parseGlobalTally();
            if (this.disconnectedProducers.size === 0) {
                for (const consumer of this.consumers.values()) {
                    consumer.setBaseState(DeviceTallyState.NONE);
                }
            }
            this.emit('producer_connected', producer.getId());
        });

        producer.on('disconnected', () => {
            this.disconnectedProducers.add(producer.getId());
            this._parseGlobalTally();
            if (this.config.state_on_disconnect !== DeviceTallyState.NONE) {
                for (const consumer of this.consumers.values()) {
                    consumer.setBaseState(this.config.state_on_disconnect);
                }
            }
            this.emit('producer_disconnected', producer.getId());
        });

        producer.on('info_update', (newInfo: ProducerInfo) => {
            this.emit('producer_info', newInfo);
        });
    }

    async removeProducer(id: ProducerId): Promise<void> {
        const producer = this.producers.get(id);
        if (!producer) {
            this.logger.warn(`Attempted to remove unknown producer:`, id);
        } else {
            await producer.destroy();
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

        for (const [producerId, state] of this.producerTallyStates.entries()) {
            if (this.disconnectedProducers.has(producerId)) continue;
            if (!state.moment || state.moment == 0)
                continue;
            
            state.program.forEach(source => newGlobalTally.program.add(source));
            state.preview.forEach(source => newGlobalTally.preview.add(source));
            
            if (state.moment && state.moment > newGlobalTally.moment )
                newGlobalTally.moment = state.moment;
        }

        const hasConnectedProducers = [...this.producers.keys()].some(id => !this.disconnectedProducers.has(id));

        if (newGlobalTally.moment == 0 && hasConnectedProducers) {
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

    getProducerInfo(id: ProducerId): ProducerInfo {
        const producer = this.producers.get(id);
        return producer?.getInfo() || { update_moment: null, model: {}, sources: new Map() };
    }

    getProducerIds(): ProducerId[] {
        return Array.from(this.producers.keys());
    }

    getProducerInfos(): Map<ProducerId, ProducerInfo> {
        const info = new Map<ProducerId, ProducerInfo>();
        for (const [id, producer] of this.producers) {
            info.set(id, producer.getInfo());
        }
        return info;
    }

    hasConsumer(id: ConsumerId): boolean {
        return this.consumers.has(id);
    }

    getConsumer(id: ConsumerId): AbstractConsumer | null {
        return this.consumers.get(id) ?? null;
    }

    getConsumerIds(): ConsumerId[] {
        return Array.from(this.consumers.keys());
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