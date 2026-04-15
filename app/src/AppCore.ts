import { TallyLifecycle } from "./tally/TallyLifecycle";
import { Logger } from "./logging/Logger";
import { AdminServer } from "./admin/AdminServer";
import { CoreDatabase } from "./database/CoreDatabase";
import { UpdateManager } from "./system/UpdateManager";

const UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export class AppCore {

    private lifecycle:     TallyLifecycle;
    private updateManager: UpdateManager;
    private admin:         AdminServer;
    private logger = new Logger(["CORE"]);

    constructor() {
        this.lifecycle     = new TallyLifecycle();
        this.updateManager = new UpdateManager();
        this.admin         = new AdminServer(this.updateManager);
    }

    public async start(): Promise<void> {

        this.logger.info("Starting Beacon...");

        this._registerShutdownHandlers();
        await this.lifecycle.boot();
        this._wireAdminServer();

        this.admin.start();

        this.updateManager.checkForUpdates().catch(() => {});
        setInterval(() => this.updateManager.checkForUpdates().catch(() => {}), UPDATE_POLL_INTERVAL_MS).unref();

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
                info:               this.lifecycle.getInfo().system
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
