import { TallyLifecycle } from "./tally/TallyLifecycle";
import type { ProducerConfig } from "./tally/producer/AbstractTallyProducer";
import { Logger } from "./logging/Logger";
import { AdminServer } from "./admin/AdminServer";
import { CoreDatabase } from "./database/CoreDatabase";

export class AppCore {

    private lifecycle: TallyLifecycle;
    private admin = new AdminServer();
    private logger = new Logger(["CORE"]);

    constructor() {
        this.lifecycle = new TallyLifecycle();
    }

    public async start(): Promise<void> {

        this.logger.info("Starting Beacon...");

        this._registerShutdownHandlers();
        await this.lifecycle.boot();
        this._wireAdminServer();

        // TODO: Remove once the ui can configure producers and consumers.
        if (!this.lifecycle.hasConfig()) {
            await this._setupTestConfig();
        }

        this.admin.start();

        this.logger.info("Beacon started.");
    }

    private _wireAdminServer(): void {
        const orchestrator = this.lifecycle.getOrchestrator();

        const syncState = () => {
            this.admin.setState({
                producers:          this.lifecycle.getProducers(),
                consumers:          this.lifecycle.getConfig().consumers,
                devices:            this.lifecycle.getDevices(),
                orchestratorConfig: this.lifecycle.getOrchestratorConfig(),
            });
        };

        orchestrator.on("producer_added",    syncState);
        orchestrator.on("producer_removed",  syncState);
        orchestrator.on("consumer_added",    syncState);
        orchestrator.on("consumer_removed",  syncState);
        orchestrator.on("producer_info",     syncState);

        syncState();

        // ? Producers

        this.admin.on("add_producer", (type, config) => {
            this.lifecycle.addProducer(type, config).then(syncState).catch((err) => {
                this.logger.error("Failed to add producer:", err);
            });
        });

        this.admin.on("update_producer", (id, type, config) => {
            this.lifecycle.updateProducer(id, type, config).then(syncState).catch((err) => {
                this.logger.error("Failed to update producer:", id, err);
            });
        });

        this.admin.on("remove_producer", (id) => {
            this.lifecycle.removeProducer(id).catch((err) => {
                this.logger.error("Failed to remove producer:", id, err);
            });
        });

        // ? Consumers

        this.admin.on("update_consumer", (update) => {
            this.lifecycle.updateConsumer(update).then(syncState).catch((err) => {
                this.logger.error("Failed to update consumer:", err);
            });
        });

        // ? Devices

        this.admin.on("patch_device", (address, patch) => {
            this.lifecycle.patchDevice(address, patch);
            syncState();
        });

        this.admin.on("rename_device", (address, name) => {
            this.lifecycle.renameDevice(address, name);
            syncState();
        });

        this.admin.on("remove_device", (address) => {
            this.lifecycle.removeDevice(address);
            syncState();
        });

        this.admin.on("send_alert", (address, type, target) => {
            this.lifecycle.sendAlert(address, type, target);
        });

        // ? Config

        this.admin.on("update_orchestrator", (config) => {
            this.lifecycle.updateOrchestratorConfig(config).then(syncState).catch((err) => {
                this.logger.error("Failed to update orchestrator config:", err);
            });
        });

        this.admin.on("import_config", (config) => {
            this.lifecycle.importConfig(config).then(syncState).catch((err) => {
                this.logger.error("Failed to import config:", err);
            });
        });
    }

    private async _setupTestConfig(): Promise<void> {
        this.logger.info("No persisted config found, loading test config...");
        await this.lifecycle.addProducer("AtemNetClientTallyProducer", {
            id: "atem1",
            name: "ATEM-TVSHD",
            host: "127.0.0.1",
        } as unknown as ProducerConfig);
    }

    private _registerShutdownHandlers(): void {
        const shutdown = async () => {
            this.logger.info("Shutting down...");
            await this.lifecycle.shutdown();
            CoreDatabase.destroy();
            process.exit(0);
        };

        process.prependListener("SIGINT", shutdown);
        process.prependListener("SIGTERM", shutdown);
        process.on("exit", () => { CoreDatabase.destroy(); });
        process.on("uncaughtException", (err) => { this.logger.fatal("Uncaught exception", err); });
        process.on("unhandledRejection", (reason) => { this.logger.fatal("Unhandled rejection", reason); });
    }
}
