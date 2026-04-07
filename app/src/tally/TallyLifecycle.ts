import { CoreDatabase } from "../database/CoreDatabase";
import { TallyFactory } from "./TallyFactory";
import { TallyOrchestrator, type OrchestratorConfig } from "./TallyOrchestrator";
import type { AbstractTallyProducer } from "./producer/AbstractTallyProducer";
import type { AbstractConsumer } from "./consumer/AbstractConsumer";
import type { ProducerId } from "./types/ProducerStates";
import type { ConsumerId } from "./types/ConsumerStates";
import { Logger } from "../logging/Logger";

export class TallyLifecycle {

    private db = CoreDatabase.getInstance();
    private orchestrator: TallyOrchestrator;
    private logger = new Logger(["Tally", "Lifecycle"]);

    constructor(orchestratorConfig: OrchestratorConfig = {}) {
        this.orchestrator = new TallyOrchestrator(orchestratorConfig);
    }

    public getOrchestrator(): TallyOrchestrator {
        return this.orchestrator;
    }

    public hasConfig(): boolean {
        return this.db.getProducers().length > 0 || this.db.getConsumers().length > 0;
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
        if (this.orchestrator.hasProducer(producer.getId())) {
            this.logger.warn(`Producer already exists, skipping add:`, producer.getId());
            return;
        }
        this.db.saveProducer(producer);
        await producer.init();
        this.orchestrator.addProducer(producer);
    }

    public async updateProducer(id: ProducerId, type: string, config: object): Promise<void> {
        this.removeProducer(id);
        const producer = TallyFactory.createProducer(type, { ...config, id });
        await this.addProducer(producer);
    }

    public removeProducer(id: ProducerId): void {
        this.db.deleteProducer(id);
        this.orchestrator.removeProducer(id);
    }

    public async addConsumer(consumer: AbstractConsumer): Promise<void> {
        if (this.orchestrator.hasConsumer(consumer.getId())) {
            this.logger.warn(`Consumer already exists, skipping add:`, consumer.getId());
            return;
        }
        this.db.saveConsumer(consumer);
        await consumer.init();
        this.orchestrator.addConsumer(consumer);
    }

    public async updateConsumer(id: ConsumerId, type: string, config: object): Promise<void> {
        this.removeConsumer(id);
        const consumer = TallyFactory.createConsumer(type, { ...config, id });
        await this.addConsumer(consumer);
    }

    public removeConsumer(id: ConsumerId): void {
        this.db.deleteConsumer(id);
        this.orchestrator.removeConsumer(id);
    }

    public async shutdown(): Promise<void> {
        for (const id of this.orchestrator.getProducerIds()) {
            try {
                this.orchestrator.removeProducer(id);
            } catch (e) {
                this.logger.error(`Error destroying producer:`, id, e);
            }
        }

        for (const id of this.orchestrator.getConsumerIds()) {
            try {
                this.orchestrator.removeConsumer(id);
            } catch (e) {
                this.logger.error(`Error destroying consumer:`, id, e);
            }
        }

        this.logger.info(`Shutdown complete.`);
    }
}
