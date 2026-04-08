import { CoreDatabase, SettingKey } from "../database/CoreDatabase";
import { TallyFactory } from "./TallyFactory";
import { TallyOrchestrator, type OrchestratorConfig } from "./TallyOrchestrator";
import type { AbstractTallyProducer, ProducerConfig } from "./producer/AbstractTallyProducer";
import type { ProducerId } from "./types/ProducerStates";
import { Logger } from "../logging/Logger";
import { AedesNetworkConsumer, type AedesConsumerConfig } from "./consumer/networkConsumer/AedesNetworkConsumer";
import { RpiGpioHardwareConsumer, type GpioConsumerConfig } from "./consumer/hardwareConsumer/RpiGpioHardwareConsumer";
import type { AbstractConsumer, ConsumerConfig } from "./consumer/AbstractConsumer";
import type { ConsumerId } from "./types/ConsumerStates";

export interface ConsumerSetting<TConfig extends ConsumerConfig = ConsumerConfig> {
    enabled: boolean;
    config: TConfig;
}

export interface ConsumerUpdate {
    id: ConsumerId;
    enabled?: boolean;
    config?: Partial<ConsumerConfig>;
}

export interface LifecycleConfig {
    consumers: Record<ConsumerId, ConsumerSetting>;
    producers: { type: string; config: ProducerConfig }[];
}

interface ConsumerRegistryEntry {
    settingKey: SettingKey;
    factory: (config: ConsumerConfig) => AbstractConsumer;
}

export class TallyLifecycle {

    private db = CoreDatabase.getInstance();
    private orchestrator: TallyOrchestrator;
    private logger = new Logger(["Tally", "Lifecycle"]);
    private config: { consumers: Record<ConsumerId, ConsumerSetting> };
    private _restarting = new Set<ConsumerId>();

    // Add a consumer here and in _registry to register it.
    public static readonly DefaultConsumers: Record<ConsumerId, ConsumerSetting> = {
        aedes: { enabled: true,  config: { ...AedesNetworkConsumer.DefaultConfig } },
        gpio:  { enabled: false, config: { ...RpiGpioHardwareConsumer.DefaultConfig } },
    };

    private readonly _registry: Record<ConsumerId, ConsumerRegistryEntry> = {
        aedes: { settingKey: SettingKey.ConsumerAedes, factory: (c) => new AedesNetworkConsumer(c as AedesConsumerConfig) },
        gpio:  { settingKey: SettingKey.ConsumerGpio,  factory: (c) => new RpiGpioHardwareConsumer(c as GpioConsumerConfig) },
    };

    constructor(orchestratorConfig: OrchestratorConfig = {}) {
        this.orchestrator = new TallyOrchestrator(orchestratorConfig);
        this.config = { consumers: this._loadConsumers() };
    }

    private _loadConsumers(): Record<ConsumerId, ConsumerSetting> {
        const consumers: Record<ConsumerId, ConsumerSetting> = {};
        for (const [id, entry] of Object.entries(this._registry)) {
            consumers[id] = this.db.getSetting<ConsumerSetting>(entry.settingKey)
                ?? TallyLifecycle.DefaultConsumers[id];
        }
        return consumers;
    }

    public getOrchestrator(): TallyOrchestrator {
        return this.orchestrator;
    }

    public getConfig(): LifecycleConfig {
        return { consumers: this.config.consumers, producers: this.db.getProducers() };
    }

    public hasConfig(): boolean {
        return this.db.getProducers().length > 0;
    }

    public async boot(): Promise<void> {
        for (const { type, config } of this.db.getProducers()) {
            try {
                const producer = TallyFactory.createProducer(type, config);
                await producer.init();
                this.orchestrator.addProducer(producer);
                this.logger.info(`Restored producer: ${config.id} (${type})`);
            } catch (e) {
                this.logger.error(`Failed to restore producer: ${config.id} (${type})`, e);
            }
        }

        for (const [id, setting] of Object.entries(this.config.consumers)) {
            if (setting.enabled) await this._startConsumer(id);
        }
    }

    // ? Producer methods

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
        await this.removeProducer(id);
        const producer = TallyFactory.createProducer(type, { ...config, id });
        await this.addProducer(producer);
    }

    public async removeProducer(id: ProducerId): Promise<void> {
        this.db.deleteProducer(id);
        await this.orchestrator.removeProducer(id);
    }

    // ? Consumer methods

    public async updateConsumer(update: ConsumerUpdate): Promise<void> {
        const entry = this._registry[update.id];
        if (!entry) {
            this.logger.warn(`Unknown consumer ID, skipping update:`, update.id);
            return;
        }

        const current = this.config.consumers[update.id];
        if (update.enabled !== undefined) current.enabled = update.enabled;
        if (update.config) current.config = { ...current.config, ...update.config };

        this.db.setSetting(entry.settingKey, current);
        await this._restartConsumer(update.id);
    }

    public async importConfig(config: LifecycleConfig): Promise<void> {
        for (const [id, setting] of Object.entries(config.consumers)) {
            const entry = this._registry[id];
            if (!entry) {
                this.logger.warn(`Unknown consumer ID in import, skipping:`, id);
                continue;
            }
            this.config.consumers[id] = setting;
            this.db.setSetting(entry.settingKey, setting);
            await this._restartConsumer(id);
        }

        for (const id of this.orchestrator.getProducerIds()) {
            await this.removeProducer(id);
        }
        for (const { type, config: pConfig } of config.producers) {
            const producer = TallyFactory.createProducer(type, pConfig);
            await this.addProducer(producer);
        }
    }

    private async _restartConsumer(id: ConsumerId): Promise<void> {
        if (this._restarting.has(id)) {
            this.logger.warn(`Consumer restart already in progress, skipping:`, id);
            return;
        }
        this._restarting.add(id);
        try {
            if (this.orchestrator.hasConsumer(id)) {
                this.logger.info(`Initialise STOP consumer:`, id);
                await this.orchestrator.removeConsumer(id);
                this.logger.info(`Stopped consumer:`, id);
            }
            if (this.config.consumers[id]?.enabled) {
                await this._startConsumer(id);
            }
        } finally {
            this._restarting.delete(id);
        }
    }

    private async _startConsumer(id: ConsumerId): Promise<void> {
        const entry = this._registry[id];
        if (!entry) {
            this.logger.error(`No factory registered for consumer:`, id);
            return;
        }
        const { config } = this.config.consumers[id];
        try {
            const consumer = entry.factory(config);
            await consumer.init();
            this.orchestrator.addConsumer(consumer);
            this.logger.info(`Started consumer:`, id);
        } catch (e) {
            this.logger.error(`Failed to start consumer:`, id, e);
        }
    }

    // ? Shutdown

    public async shutdown(): Promise<void> {
        for (const id of this.orchestrator.getProducerIds()) {
            try {
                await this.orchestrator.removeProducer(id);
            } catch (e) {
                this.logger.error(`Error destroying producer:`, id, e);
            }
        }
        for (const id of this.orchestrator.getConsumerIds()) {
            try {
                await this.orchestrator.removeConsumer(id);
            } catch (e) {
                this.logger.error(`Error destroying consumer:`, id, e);
            }
        }
        CoreDatabase.destroy();
        this.logger.info(`Shutdown complete.`);
    }
}