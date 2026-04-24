import { CoreDatabase, SettingKey } from "../database/CoreDatabase";
import { TallyFactory } from "./TallyFactory";
import { TallyOrchestrator, type OrchestratorConfig } from "./TallyOrchestrator";
export type { OrchestratorConfig };
import { ProducerStatus, type ProducerConfig } from "./producer/AbstractTallyProducer";
import type { ProducerBundle, ProducerId } from "./types/ProducerTypes";
import { Logger } from "../logging/Logger";
import type { AedesConsumerConfig } from "./consumer/networkConsumer/AedesNetworkConsumer";
import type { GpioConsumerConfig } from "./consumer/hardwareConsumer/RpiGpioHardwareConsumer";
import type { AbstractConsumer, ConsumerConfig, ConsumerInfo } from "./consumer/AbstractConsumer";
import { TallyDeviceDto, type DeviceAddress, type DeviceAlertAction, type DeviceAlertTarget, type DeviceName, type TallyDevice } from "./types/DeviceTypes";
import type { ConsumerId } from "./types/ConsumerTypes";
import type { GlobalSource } from "./types/SourceTypes";
import { HardwareVersion, type SystemInfo } from "../types/SystemInfo";
import SystemInfoUtil from "../system/SystemInfoUtil";
import { SimpleBusNode } from "./types/LogicTypes";

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
    isDisableable: () => boolean;
};

type ConsumerExport = {
    available: boolean;
    disableable: boolean;
    info?: ConsumerInfo;
};

type ConsumerEntryMap    = ConsumerMap<ConsumerRuntime>;
export type ConsumerExportMap   = ConsumerMap<ConsumerExport>;

type LifecycleConfigInternal = {
    consumers: ConsumerEntryMap;
    orchestrator: Partial<OrchestratorConfig>;
};

export interface LifecycleConfig {
    producers?: Array<{ type: string; config: ProducerConfig }>;
    consumers?: ConsumerExportMap;
    orchestrator?: Partial<OrchestratorConfig>;
}

//? Info
export interface LifeCycleInfo {
    system: SystemInfo
}

export class TallyLifecycle {

    // TODO: HANDLE SYSTEM INFO TO CONSUMERS!

    private db = CoreDatabase.getInstance();
    private orchestrator!: TallyOrchestrator;
    private logger = new Logger(["Tally", "Lifecycle"]);
    private _restarting = new Set<ConsumerId>();

    public info: LifeCycleInfo = {
        system: {
            hardware: HardwareVersion.UNKNOWN,
        }
    };

    private _config: LifecycleConfigInternal = {
        orchestrator: {} as Partial<OrchestratorConfig>,
        consumers: {
            aedes: {
                factory: (config: AedesConsumerConfig) => TallyFactory.createConsumer('AedesNetworkConsumer', config),
                isAvailable: () => true,
                isDisableable: () => false,
                enabled: true,
                config: {},
            },
            gpio: {
                factory: (config: GpioConsumerConfig) => TallyFactory.createConsumer('RpiGpioHardwareConsumer', config),
                isAvailable: () => this.info.system.hardware == HardwareVersion.V2,
                isDisableable: () => true,
                enabled: true,
                config: {},
            },
        } as ConsumerEntryMap,
    };

    constructor() {
    }

    public async boot(): Promise<void> {
        this.logger.info(`Initializing TallyLifecycle...`);

        this.info.system = SystemInfoUtil.getSystemInfo();
        this.logger.info(`System Info:`, this.info);


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

        for (const { type, enabled, config } of this.db.getProducers()) {
            if (!enabled) {
                this.logger.info(`Skipping disabled producer: ${config.id} (${type})`);
                continue;
            }
            try {
                await this._startProducer(type, config);
                this.logger.info(`Restored producer: ${config.id} (${type})`);
            } catch (e) {
                this.logger.error(`Failed to restore producer: ${config.id} (${type})`, e);
            }
        }

        await this._loadConsumers();
        this.logger.info(`Finished initializing TallyLifecycle successfully.`);
        this.logger.debug(`TallyLifecycle initialized with config:`, this.getConfig(), `and info:`, this.info);
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
                const { factory: _, isAvailable, isDisableable, ...rest } = entry;
                const info = this.orchestrator?.getConsumer(id)?.getInfo();
                return [id, { ...rest, available: isAvailable(), disableable: isDisableable(), info }];
            })
        ) as ConsumerExportMap;

        return {
            consumers,
            orchestrator: this._config.orchestrator,
        };
    }

    public async importConfig(config: LifecycleConfig): Promise<void> {
        if (config.consumers) {
            for (const [id, setting] of Object.entries(config.consumers) as [RegisteredConsumerId, LifeCycleConsumerConfig][]) {
                if (!(id in this._config.consumers)) {
                    this.logger.warn(`Unknown consumer ID in import, skipping:`, id);
                    continue;
                }
                if (setting.enabled !== undefined) this._config.consumers[id].enabled = setting.enabled;
                if (setting.config)               this._config.consumers[id].config  = { ...this._config.consumers[id].config, ...setting.config };
                this.db.setSetting(SettingKey.consumers[id], { enabled: this._config.consumers[id].enabled, config: this._config.consumers[id].config });
                await this._restartConsumer(id);
            }
        }

        if (config.producers) {
            for (const id of this.orchestrator.getProducerIds()) {
                await this.removeProducer(id);
            }
            for (const { type, config: pConfig } of config.producers) {
                try {
                    await this.addProducer(type, pConfig);
                } catch (e) {
                    this.logger.error(`Failed to import producer:`, pConfig.id, e);
                }
            }
        }

        if (config.orchestrator) {
            this._config.orchestrator = { ...this._config.orchestrator, ...config.orchestrator };
        }

        this.logger.info(`Config imported.`);
    }


    public hasConfig(): boolean {
        return this.db.getProducers().length > 0;
    }

    public getOrchestratorConfig(): Partial<OrchestratorConfig> {
        return this._config.orchestrator;
    }

    public async updateOrchestratorConfig(config: Partial<OrchestratorConfig>): Promise<void> {
        this._config.orchestrator = { ...this._config.orchestrator, ...config };
        this.db.setSetting(SettingKey.orchestrator, this._config.orchestrator);
        this.orchestrator.updateConfig(config);
        this.logger.info(`Orchestrator config updated:`, this._config.orchestrator);
    }

    // ? Producer methods

    private async _startProducer(type: string, config: ProducerConfig): Promise<void> {
        const producer = TallyFactory.createProducer(type, config);
        await producer.init();
        this.orchestrator.addProducer(producer);
    }

    public async addProducer(type: string, config: ProducerConfig): Promise<void> {
        if (this.orchestrator.hasProducer(config.id)) {
            this.logger.warn(`Producer already exists, skipping add:`, config.id);
            return;
        }
        await this._startProducer(type, config);
        this.db.saveProducer({ type, enabled: true, config });
    }

    public async updateProducer(id: ProducerId, type: string, config: object): Promise<void> {
        const fullConfig = { ...config, id } as ProducerConfig;
        const oldRecord = this.db.getProducers().find(p => p.config.id === id);
        await this.removeProducer(id);
        try {
            await this.addProducer(type, fullConfig);
        } catch (e) {
            if (oldRecord)
                await this.addProducer(oldRecord.type, oldRecord.config).catch(re => this.logger.error(`Failed to restore producer:`, id, re));
            throw e;
        }
    }

    public async removeProducer(id: ProducerId): Promise<void> {
        this.db.deleteProducer(id);
        await this.orchestrator.removeProducer(id);
    }

    public async setProducerEnabled(id: ProducerId, enabled: boolean): Promise<void> {
        const record = this.db.getProducers().find(p => p.config.id === id);
        if (!record) {
            this.logger.warn(`setProducerEnabled: producer not found:`, id);
            return;
        }
        this.db.saveProducer({ type: record.type, enabled, config: record.config });
        if (enabled && !this.orchestrator.hasProducer(id)) {
            await this._startProducer(record.type, record.config);
        } else if (!enabled && this.orchestrator.hasProducer(id)) {
            await this.orchestrator.removeProducer(id);
        }
    }

    
    public getProducers(): ProducerBundle[] { // TODO: Check if a producer should have a getBundle?
        return this.db.getProducers().map(({ type, enabled, config }) => {
            const info = this.orchestrator.getProducerInfo(config.id);
            if (!enabled)
                return { type, enabled, config, info: { ...info, status: ProducerStatus.DISABLED } };
            return { type, enabled, config, info };
        });
    }

    // ? Consumer methods
    public async updateConsumer(update: ConsumerUpdate): Promise<void> {

        const id = this.getRegisteredConsumer(update.id);


        if (!id) {
            this.logger.warn(`Unknown consumer ID, skipping update:`, id);
            return;
        }

        const entry = this._config.consumers[id];

        if (update.enabled === false && !entry.isDisableable()) {
            this.logger.warn(`Consumer cannot be disabled:`, id);
            return;
        }

        const prevEnabled = entry.enabled;
        const prevConfig  = entry.config;

        entry.enabled = update.enabled ?? entry.enabled;
        entry.config  = { ...entry.config, ...update.config };

        try {
            await this._restartConsumer(update.id);
            this.db.setSetting(SettingKey.consumers[id], { enabled: entry.enabled, config: entry.config });
        } catch (e) {
            entry.enabled = prevEnabled;
            entry.config  = prevConfig;
            throw e;
        }

    }

    // TODO, callback from orchestrator in appcore instead?
    public getDevices(): Map<ConsumerId, Array<TallyDevice>> {
        return this.orchestrator.getDevices();
    }

    // ? Device methods — delegate to the owning consumer

    public patchDevice(address: DeviceAddress, patch: GlobalSource[]): void {
        const consumer = this.orchestrator.getConsumer(address.consumer); // TODO: Add getDevice to Orchestrator
        if (!consumer) { this.logger.warn(`patchDevice: no consumer for`, address.consumer); return; }
        const device = consumer.getDevice(address);
        if (!device) { this.logger.warn(`patchDevice: no device for`, address); return; }
        device.logic = new SimpleBusNode(patch);
        consumer.updateDevice(device);
    }

    public renameDevice(address: DeviceAddress, name: DeviceName): void {
        const consumer = this.orchestrator.getConsumer(address.consumer); // TODO: Add getDevice to Orchestrator
        if (!consumer) { this.logger.warn(`renameDevice: no consumer for`, address.consumer); return; }
        const device = consumer.getDevice(address);
        if (!device) { this.logger.warn(`renameDevice: no device for`, address); return; }
        device.name = name;
        consumer.updateDevice(device);
    }

    public removeDevice(address: DeviceAddress): void {
        const consumer = this.orchestrator.getConsumer(address.consumer);
        if (!consumer) { this.logger.warn(`removeDevice: no consumer for`, address.consumer); return; }
        consumer.deleteDevice(address);
    }

    public sendAlert(address: DeviceAddress, action: DeviceAlertAction, target: DeviceAlertTarget, timeout: number): void {
        const consumer = this.orchestrator.getConsumer(address.consumer); // TODO: Add getDevice to Orchestrator
        if (!consumer) { this.logger.warn(`sendAlert: no consumer for`, address.consumer); return; }
        const device = consumer.getDevice(address);
        if (!device) { this.logger.warn(`sendAlert: no device for`, address); return; }
        consumer.sendDeviceAlert(new TallyDeviceDto(device).toAlertBundle({ action, target, timeout }));
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
            const entry = this._config.consumers[id];
            if (entry.enabled) {

                if (!entry.isAvailable()) {
                    this.updateConsumer({ id, enabled: false });
                    this.logger.warn(`Skipping consumer, it is not available on this hardware:`, id);
                    return;
                }

                // Dry-construct: runs checkConfig() in ctor, no port binding until init().
                // Throws here if config is invalid, before the old consumer is touched.
                const consumer = entry.factory(entry.config);

                if (this.orchestrator.hasConsumer(id)) {
                    this.logger.info(`Stopping consumer:`, id);
                    await this.orchestrator.removeConsumer(id);
                    this.logger.info(`Stopped consumer:`, id);
                }

                await consumer.init();

                this.orchestrator.addConsumer(consumer);

                this.logger.info(`Started consumer:`, id);
            } else {
                if (this.orchestrator.hasConsumer(id)) {
                    this.logger.info(`Stopping consumer:`, id);
                    await this.orchestrator.removeConsumer(id);
                    this.logger.info(`Stopped consumer:`, id);
                }
            }
        } catch (e) {
            this.logger.error(`Failed to (re)-start consumer:`, id, e);
            throw e;
        } finally {
            this._restarting.delete(id);
        }
    }

    // ? Shutdown

    public async shutdown(): Promise<void> {
        this.logger.info("Stopping Producers...");

        for (const id of this.orchestrator.getProducerIds()) {
            try {
                this.logger.info(`  -> Stopping Producer: ${id}`);
                await this.orchestrator.removeProducer(id);
            } catch (e) {
                this.logger.error(`Error destroying producer:`, id, e);
            }
        }

        this.logger.info("Stopping Consumers...");
        for (const id of this.orchestrator.getConsumerIds()) {
            this.logger.info(`  -> Stopping Consumer: ${id}`);
            
            try {
                await Promise.race([
                    this.orchestrator.removeConsumer(id),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT: ${id} failed to stop in 2s`)), 2000))
                ]).catch(err => this.logger.error(err.message));
            } catch (e) {
                this.logger.error(`Error destroying consumer:`, id, e);
            }
        }
        this.logger.info(`Shutdown complete.`);
    }
}