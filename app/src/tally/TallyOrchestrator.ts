import { EventEmitter } from "events";
import { AbstractConsumer } from "./consumer/AbstractConsumer";
import { SourceBusDto, type SourceBus } from "./types/SourceTypes";
import type { ProducerId } from "./types/ProducerTypes";
import { AbstractTallyProducer, type ProducerInfo, ProducerStatus } from "./producer/AbstractTallyProducer";
import { type AlertSlotConfig, type DeviceTallyPackage, DeviceTallyState, type TallyDevice, TallyDeviceDto } from "./types/DeviceTypes";
import type { ConsumerId } from "./types/ConsumerTypes";
import { Logger } from "../logging/Logger";
import { PatchLogicEngine } from "./logic/PatchLogicEngine";
import { disconnect } from "cluster";

export type { AlertSlotConfig };

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

    protected logicEngine: PatchLogicEngine = new PatchLogicEngine();
    
    protected config: Required<OrchestratorConfig>;

    public static readonly DefaultConfig: Required<OrchestratorConfig> = {
        state_on_disconnect: DeviceTallyState.NONE,
    };


    private producers: Map<ProducerId, AbstractTallyProducer> = new Map();

    private disconnectedProducers: Set<ProducerId> = new Set();
    private _connectGraceTimers: Map<ProducerId, ReturnType<typeof setTimeout>> = new Map();
    
    // Parsed to globalTallyState, but kept to partially update the global bus.
    private producerTallyStates: Map<ProducerId, SourceBus> = new Map();
    private globalTallyState: SourceBus = {
        preview: new Set(),
        program: new Set()
    }

    private consumers: Map<ConsumerId, AbstractConsumer> = new Map();


    constructor(config: OrchestratorConfig) {
        super();
        this.config = { ...TallyOrchestrator.DefaultConfig, ...config };

        this.logger = new Logger(["Tally", "Orchestrator"]);

        this.checkConfig(this.config);
    }

    private parseDevices(newbus: SourceBus | null = null): void {

        const oldbus = this.globalTallyState;

        if (newbus) 
            this.globalTallyState = newbus;

        for (const consumer of this.consumers.values()) {
            for (const device of consumer.getDevices()) {
                this.sendDevice(
                    device, 
                    this.logicEngine.evaluate(device.logic, {
                        newbus: this.globalTallyState,
                        oldbus,
                        disconnectedProducers: this.disconnectedProducers,
                        disconnectedState: this.config.state_on_disconnect
                    })
                );
            }
        }
    }

    private sendDevice(device: TallyDevice, pckg: DeviceTallyPackage): void {
        for (const consumer of this.consumers.values()) {
            if (consumer.isDeviceBroadcaster()) {
                consumer.sendDeviceState(new TallyDeviceDto(device).toTallyBundle(pckg));
            }
        }
    }

    private parseNewGlobalTally(newStates: Map<ProducerId, SourceBus>): SourceBus {

        const newGlobalState: SourceBus = {
            preview: new Set(),
            program: new Set()
        };

        for (const [producerId, newState] of newStates) {

            newState.preview.forEach((sourceKey) => {
                newGlobalState.preview.add(sourceKey);
            });
            newState.program.forEach((sourceKey) => {
                newGlobalState.program.add(sourceKey);
            });
        }

        return newGlobalState;
    }

    updateConfig(config: Partial<OrchestratorConfig>): void {

        this.logger.info(`Updated config:`, config);

        let state_on_disconnect_change = false;

        if (config.state_on_disconnect != this.config.state_on_disconnect)
            state_on_disconnect_change = true;
        
        this.config = { ...this.config, ...config };

        if (state_on_disconnect_change) {
            this.logger.info(`State on disconnect changed to ${DeviceTallyState[this.config.state_on_disconnect]}. Disconnected producers: ${this.disconnectedProducers.size}.`)
            this.parseDevices();
        }
    }

    protected checkConfig(config: OrchestratorConfig){

    }

    addConsumer(consumer: AbstractConsumer): void {
        this.consumers.set(consumer.getId(), consumer);
        // TODO
        // consumer.on('device_update', (device: TallyDevice) => {
        //     for (const consumer of this.consumers.values()) {
        //         consumer.sendDeviceState(new TallyDeviceDto(device).toTallyBundle(tallyPckg));
        //     }

        // });
        this.emit('consumer_added', consumer.getId());

        
        this.parseDevices();

        // this._parseGlobalTally();
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

        const graceTimer = setTimeout(() => {
            this._connectGraceTimers.delete(producer.getId());
            if (producer.getInfo().status === ProducerStatus.OFFLINE) {
                this.disconnectedProducers.add(producer.getId());
            }
        }, 1000);
        this._connectGraceTimers.set(producer.getId(), graceTimer);

        producer.on('tally_update', (newState: SourceBus) => {
            
            this.producerTallyStates.set(producer.getId(), newState);

            const newGlobal = this.parseNewGlobalTally(this.producerTallyStates);

            this.parseDevices(newGlobal);

        });

        producer.on('connected', () => {
            const timer = this._connectGraceTimers.get(producer.getId());
            if (timer) {
                clearTimeout(timer);
                this._connectGraceTimers.delete(producer.getId());
            }
            this.disconnectedProducers.delete(producer.getId());
            
            this.parseDevices();

            this.emit('producer_connected', producer.getId());
        });

        producer.on('disconnected', () => {
            if (producer.isDestroying()) return;
            this.disconnectedProducers.add(producer.getId());
            
            this.parseDevices();
            
            this.emit('producer_disconnected', producer.getId());
        });

        producer.on('info_update', (newInfo: ProducerInfo) => {
            this.emit('producer_info', newInfo);
        });
    }

    async removeProducer(id: ProducerId): Promise<void> {
        const timer = this._connectGraceTimers.get(id);
        if (timer) {
            clearTimeout(timer);
            this._connectGraceTimers.delete(id);
        }
        const producer = this.producers.get(id);
        if (!producer) {
            this.logger.warn(`Attempted to remove unknown producer:`, id);
        } else {
            producer.markDestroying();
            await producer.destroy();
            this.producers.delete(id);
        }
        this.producerTallyStates.delete(id);
        this.disconnectedProducers.delete(id);
        
        const newGlobal = this.parseNewGlobalTally(this.producerTallyStates);
        this.parseDevices(newGlobal);

        this.emit('producer_removed', id);
    }

    // private _parseGlobalTally() {
    //     const newGlobalTally: Required<SourceBus> = {
    //         moment: 0,
    //         program: new Set(),
    //         preview: new Set(),
    //     }

    //     for (const [producerId, state] of this.producerTallyStates.entries()) {
    //         if (this.disconnectedProducers.has(producerId)) continue;
    //         if (!state.moment || state.moment == 0)
    //             continue;
            
    //         state.program.forEach(source => newGlobalTally.program.add(source));
    //         state.preview.forEach(source => newGlobalTally.preview.add(source));
            
    //         if (state.moment && state.moment > newGlobalTally.moment )
    //             newGlobalTally.moment = state.moment;
    //     }

    //     const hasConnectedProducers = [...this.producers.keys()].some(id => !this.disconnectedProducers.has(id));

    //     if (newGlobalTally.moment == 0 && hasConnectedProducers) {
    //         this.logger.warn(`Did not set tally, because of invalid payload. Might be due to init. Global Tally:`, SourceBusDto.from(newGlobalTally).serialize());
    //         return;
    //     }


    //     this.logger.debug("Tally update:", SourceBusDto.from(newGlobalTally).serialize());

    //     this.globalTallyState = newGlobalTally;

    //     for (const consumer of this.consumers.values()) {
    //         consumer.consumeTally(this.globalTallyState);
    //     }
    // }

    hasProducer(id: ProducerId): boolean {
        return this.producers.has(id);
    }

    getProducerInfo(id: ProducerId): ProducerInfo {
        const producer = this.producers.get(id);
        return producer?.getInfo() || { update_moment: null, model: {}, sources: new Map(), status: ProducerStatus.DISABLED };
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
            const devices = consumer.getDevices();

            output.set(consumer.getId(), devices);
        });

        return output;
    }
       
}