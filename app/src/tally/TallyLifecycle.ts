import { CoreDatabase } from "../database/CoreDatabase";
import { TallyFactory } from "./TallyFactory";
import { TallyOrchestrator, type OrchestratorConfig } from "./TallyOrchestrator";
import type { AbstractTallyProducer, ProducerConfig } from "./producer/AbstractTallyProducer";
import type { AbstractConsumer, ConsumerConfig } from "./consumer/AbstractConsumer";
import type { ProducerId } from "./types/ProducerStates";
import type { ConsumerId } from "./types/ConsumerStates";
import { Logger } from "../logging/Logger";

export class TallyLifecycle {

    private db = CoreDatabase.getInstance();
    private orchestrator: TallyOrchestrator;
    private logger = new Logger(["TallyLifecycle"]);

    constructor(orchestratorConfig: OrchestratorConfig = {}) {
        this.orchestrator = new TallyOrchestrator(orchestratorConfig);
    }

    public getOrchestrator(): TallyOrchestrator {
        return this.orchestrator;
    }

    public async boot(): Promise<void> {
        const producers = this.db.getProducers();
        for (const { type, config } of producers) {
            try {
                const producer = TallyFactory.createProducer(type, config);
                await producer.init();
                this.orchestrator.addProducer(producer);
                this.logger.info(`Restored producer: ${config.id} (${type})`);
            } catch (e) {
                this.logger.error(`Failed to restore producer: ${config.id} (${type})`, e);
            }
        }

        const consumers = this.db.getConsumers();
        for (const { type, config } of consumers) {
            try {
                const consumer = TallyFactory.createConsumer(type, config);
                await consumer.init();
                this.orchestrator.addConsumer(consumer);
                this.logger.info(`Restored consumer: ${config.id} (${type})`);
            } catch (e) {
                this.logger.error(`Failed to restore consumer: ${config.id} (${type})`, e);
            }
        }
    }

    public async addProducer(producer: AbstractTallyProducer): Promise<void> {
        this.db.saveProducer(producer);
        await producer.init();
        this.orchestrator.addProducer(producer);
    }

    public removeProducer(id: ProducerId): void {
        this.db.deleteProducer(id);
        this.orchestrator.removeProducer(id);
    }

    public async addConsumer(consumer: AbstractConsumer): Promise<void> {
        this.db.saveConsumer(consumer);
        await consumer.init();
        this.orchestrator.addConsumer(consumer);
    }

    public removeConsumer(id: ConsumerId): void {
        this.db.deleteConsumer(id);
        this.orchestrator.removeConsumer(id);
    }
}
