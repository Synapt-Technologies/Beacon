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
import { HardwareVersion } from "../types/SystemInfo";

// ? Mutations
export interface ConsumerUpdate<T extends ConsumerConfig = ConsumerConfig> {
    id: ConsumerId;
    enabled?: boolean;
    config?: Partial<T>;
}

// ? Config
export interface LifeCycleConsumerConfig<T extends ConsumerConfig = ConsumerConfig> {
    enabled?: boolean;
    config?: Partial<T>;
}

type ConsumerRegistry = {
    [K in keyof ConsumerConfigMap]: LifeCycleConsumerConfig<ConsumerConfigMap[K]>;
};

type ConsumerConfigMap = {
    aedes: AedesConsumerConfig;
    gpio: GpioConsumerConfig;
};

type RegisteredConsumerId = keyof ConsumerConfigMap;

export interface LifecycleConfig {
    consumers?: Required<ConsumerRegistry>;
    orchestrator?: Partial<OrchestratorConfig>;
}

//? Info
export interface LifeCycleInfo {
    hardware?: HardwareVersion;
}

export class TallyLifecycle {

    // TODO: HANDLE SYSTEM INFO TO CONSUMERS!

    public static DefaultConfig: Required<LifecycleConfig> = {
        consumers: {
            aedes: {
                enabled: true,
                config: {},
            },
            gpio: {
                enabled: true,
                config: {},
            },
        },
        orchestrator: {},        
    }

    private db = CoreDatabase.getInstance();
    private orchestrator!: TallyOrchestrator;
    private logger = new Logger(["Tally", "Lifecycle"]);
    private _restarting = new Set<ConsumerId>();

    public config: Required<LifecycleConfig> = TallyLifecycle.DefaultConfig;
    public info: LifeCycleInfo = {};

    private _registry: Record<ConsumerId, { // TODO: Merge with config. Single source of truth.
        factory:   (config: any) => AbstractConsumer;
        available: () => boolean;
    }> = {
        aedes: { 
            factory: (config) => new AedesNetworkConsumer(config), 
            available: () => true 
        },
        gpio:  { 
            factory: (config) => new RpiGpioHardwareConsumer(config), 
            available: () => this.info.hardware == HardwareVersion.V2 
        },
    };

    constructor() {
    }

    public async boot(): Promise<void> {
        // this.info = ? // TODO load hw info.

        this.config = { 
            ...TallyLifecycle.DefaultConfig, 
            orchestrator: { 
                ...this.db.getSetting(SettingKey.orchestrator) 
            }, 
            consumers: { 
                aedes: { 
                    ...TallyLifecycle.DefaultConfig.consumers.aedes,
                    ...this.db.getSetting(SettingKey.consumers.aedes) 
                }, 
                gpio: { 
                    ...TallyLifecycle.DefaultConfig.consumers.gpio,
                    ...this.db.getSetting(SettingKey.consumers.gpio) 
                } 
            } 
        };

        this.orchestrator = new TallyOrchestrator(this.config.orchestrator);

        this._loadConsumers();

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
        
        this.logger.info(`TallyLifecycle initialized with config:`, this.config, `and info:`, this.info);
    }


    public isRegisterdConsumer(id: ConsumerId): RegisteredConsumerId | null {
        if (id in this.config.consumers) 
            return id as keyof typeof this.config.consumers;

        return null;
    }

    private _loadConsumers(): void {
        for (const [id, setting] of Object.entries(this.config.consumers)) {
            const entry = this._registry[id as ConsumerId];
            if (!entry.available()) {
                this.logger.info(`Skipping consumer, it is not available on this hardware:`, id);
                continue;
            }
            if (setting?.enabled)
                this.orchestrator.addConsumer(entry.factory(setting.config ?? {}));
        }
    }

    // public getOrchestrator(): TallyOrchestrator {
    //     if (!this.orchestrator)
    //         return this.logger.fatal(`Orchestrator not initialized. Call boot() first.`);

    //     return this.orchestrator;
    // }

    public getInfo(): LifeCycleInfo {
        return this.info;
    }


    public hasConfig(): boolean {
        return this.db.getProducers().length > 0;
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

        const id = update.id as keyof typeof this.config.consumers;

        if (!(id in this.config.consumers)) {
            this.logger.warn(`Unknown consumer ID, skipping update:`, id);
            return;
        }

        const currentConfig = this.config.consumers[id] ?? {};
        const updatedConfig = { ...currentConfig, ...update };

        this.config.consumers[id] = updatedConfig;
        this.db.setSetting(SettingKey.consumers[id], updatedConfig);

        await this._restartConsumer(update.id);

    }

    // public async importConfig(config: LifecycleConfig): Promise<void> {
    //     for (const [id, setting] of Object.entries(config.consumers)) {
    //         const entry = this._registry[id];
    //         if (!entry) {
    //             this.logger.warn(`Unknown consumer ID in import, skipping:`, id);
    //             continue;
    //         }
    //         this.config.consumers[id] = setting;
    //         this.db.setSetting(entry.settingKey, setting);
    //         await this._restartConsumer(id);
    //     }

    //     for (const id of this.orchestrator.getProducerIds()) {
    //         await this.removeProducer(id);
    //     }
    //     for (const { type, config: pConfig } of config.producers) {
    //         const producer = TallyFactory.createProducer(type, pConfig);
    //         await this.addProducer(producer);
    //     }
    // }

    private async _restartConsumer(consumerId: ConsumerId): Promise<void> {

        const id = this.isRegisterdConsumer(consumerId);

        if (!id) {
            this.logger.warn(`Unknown consumer ID, skipping update:`, id);
            return;
        }
        
        if (this._restarting.has(id)) {
            this.logger.warn(`Consumer restart already in progress, skipping:`, id);
            return;
        }

        this._restarting.add(id);

        try {
            if (this.orchestrator.hasConsumer(id)) {
                this.logger.info(`Stopping consumer:`, id);
                await this.orchestrator.removeConsumer(id);
                this.logger.info(`Stopped consumer:`, id);
            }
            if ((this.config.consumers as ConsumerRegistry)[id]?.enabled) {
                await this._startConsumer(id);
            }
        } finally {
            this._restarting.delete(id);
        }
    }

    private async _startConsumer(consumerId: ConsumerId): Promise<void> {

        
        const id = this.isRegisterdConsumer(consumerId);

        if (!id) {
            this.logger.warn(`Unknown consumer ID, skipping update:`, id);
            return;
        }

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