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
export interface ConsumerUpdate<T extends ConsumerConfig = ConsumerConfig> extends LifeCycleConsumerConfig<T> {
    id: ConsumerId;
}

// ? Config
export interface LifeCycleConsumerConfig<T extends ConsumerConfig = ConsumerConfig> {
    enabled?: boolean;
    config?: Partial<T>;
}

type ConsumerConfigMap = {
    aedes: AedesConsumerConfig;
    gpio: GpioConsumerConfig;
};

type RegisteredConsumerId = keyof ConsumerConfigMap;

type ConsumerMap<Extra extends object = {}> = {
    [K in keyof ConsumerConfigMap]: LifeCycleConsumerConfig<ConsumerConfigMap[K]> & Extra;
};

type ConsumerRuntime = {
    factory: (config: any) => AbstractConsumer;
    isAvailable: () => boolean;
};

type ConsumerExport = {
    available: boolean;
};

type ConsumerEntryMap    = ConsumerMap<ConsumerRuntime>;
type ConsumerExportMap   = ConsumerMap<ConsumerExport>;

type LifecycleConfigInternal = {
    consumers: ConsumerEntryMap;
    orchestrator: Partial<OrchestratorConfig>;
};

export interface LifecycleConfig {
    consumers?: ConsumerExportMap;
    orchestrator?: Partial<OrchestratorConfig>;
}

//? Info
export interface LifeCycleInfo {
    hardware?: HardwareVersion;
}

export class TallyLifecycle {

    // TODO: HANDLE SYSTEM INFO TO CONSUMERS!

    private db = CoreDatabase.getInstance();
    private orchestrator!: TallyOrchestrator;
    private logger = new Logger(["Tally", "Lifecycle"]);
    private _restarting = new Set<ConsumerId>();

    public info: LifeCycleInfo = {};

    private _config: LifecycleConfigInternal = {
        orchestrator: {} as Partial<OrchestratorConfig>,
        consumers: {
            aedes: {
                factory: (config: any) => new AedesNetworkConsumer(config),
                isAvailable: () => true,
                enabled: true,
                config: {},
            },
            gpio: {
                factory: (config: any) => new RpiGpioHardwareConsumer(config),
                isAvailable: () => this.info.hardware == HardwareVersion.V2,
                enabled: true,
                config: {},
            },
        } as ConsumerEntryMap,
    };

    constructor() {
    }

    public async boot(): Promise<void> {
        // this.info = ? // TODO load hw info.

        this._config.orchestrator = { ...this.db.getSetting(SettingKey.orchestrator) };

        for (const id of Object.keys(this._config.consumers) as RegisteredConsumerId[]) {
            const stored = this.db.getSetting(SettingKey.consumers[id]);
            if (stored) {
                const { enabled, config } = stored;
                if (enabled !== undefined) this._config.consumers[id].enabled = enabled;
                if (config !== undefined) this._config.consumers[id].config = config;
            }
        }

        this.orchestrator = new TallyOrchestrator(this._config.orchestrator);

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

        await this._loadConsumers();
        this.logger.info(`TallyLifecycle initialized with config:`, this.getConfig(), `and info:`, this.info);
    }


    public getRegisteredConsumer(id: ConsumerId): RegisteredConsumerId | null {
        if (id in this._config.consumers)
            return id as RegisteredConsumerId;
        return null;
    }

    private async _loadConsumers(): Promise<void> {
        for (const id of Object.keys(this._config.consumers) as RegisteredConsumerId[]) {
            if (!this._config.consumers[id].enabled) continue;
            await this._restartConsumer(id);
        }
    }

    public getOrchestrator(): TallyOrchestrator { // TODO: Remove? Consumers should be managed by lifecycle, not directly by orchestrator.
        if (!this.orchestrator)
            return this.logger.fatal(`Orchestrator not initialized. Call boot() first.`);

        return this.orchestrator;
    }

    public getInfo(): LifeCycleInfo {
        return this.info;
    }

    // ? Config methods

    public getConfig(): LifecycleConfig {
        const consumers = Object.fromEntries(
            Object.entries(this._config.consumers).map(([id, entry]) => {
                const { factory: _, isAvailable, ...rest } = entry;
                return [id, { ...rest, available: isAvailable() }];
            })
        ) as ConsumerExportMap;

        return {
            consumers,
            orchestrator: this._config.orchestrator,
        };
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

    // TODO add info.
    public getProducers(): { type: string, config: ProducerConfig }[] { // TODO: assess if necessary and change type?
        return this.db.getProducers();
    }

    // ? Consumer methods
    public async updateConsumer(update: ConsumerUpdate): Promise<void> {

        const id = this.getRegisteredConsumer(update.id);


        if (!id) {
            this.logger.warn(`Unknown consumer ID, skipping update:`, id);
            return;
        }

        const entry = this._config.consumers[id];
        entry.enabled = update.enabled ?? entry.enabled;
        entry.config = { ...entry.config, ...update.config };

        this.db.setSetting(SettingKey.consumers[id], { enabled: entry.enabled, config: entry.config });

        await this._restartConsumer(update.id);

    }


    private async _restartConsumer(consumerId: ConsumerId): Promise<void> {

        const id = this.getRegisteredConsumer(consumerId);

        if (!id) {
            this.logger.warn(`Unknown consumer ID, skipping restart:`, id);
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
            const entry = this._config.consumers[id];
            if (entry.enabled) {

                if (!entry.isAvailable()) {
                    this.updateConsumer({ id, enabled: false });
                    this.logger.warn(`Skipping consumer, it is not available on this hardware:`, id);
                    return;
                }

                const consumer = entry.factory(entry.config);

                await consumer.init();
                
                this.orchestrator.addConsumer(consumer);

                this.logger.info(`Started consumer:`, id);
            }
        } catch (e) {
            this.logger.error(`Failed to (re)-start consumer:`, id, e);
        } finally {
            this._restarting.delete(id);
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
        this.logger.info(`Shutdown complete.`);
    }
}