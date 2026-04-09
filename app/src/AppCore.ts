import { TallyLifecycle } from "./tally/TallyLifecycle";
import { AtemNetClientTallyProducer } from "./tally/producer/networkProducer/AtemNetClientTallyProducer";
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
            const config = this.lifecycle.getConfig();
            this.admin.setState({
                producers: this.lifecycle.getProducers(),
                consumers: config.consumers,
            });
        };

        orchestrator.on("producer_added", syncState);
        orchestrator.on("producer_removed", syncState);
        orchestrator.on("consumer_added", syncState);
        orchestrator.on("consumer_removed", syncState);
        orchestrator.on("producer_info", syncState);

        syncState();

        this.admin.on("remove_producer", (id) => {
            this.lifecycle.removeProducer(id).catch((err) => {
                this.logger.error("Failed to remove producer:", id, err);
            });
        });

        this.admin.on("update_consumer", (update) => {
            this.lifecycle.updateConsumer(update).then(syncState).catch((err) => {
                this.logger.error("Failed to update consumer:", err);
            });
        });

        // this.admin.on("import_config", (config) => {
        //     this.lifecycle.importConfig(config).then(syncState).catch((err) => {
        //         this.logger.error("Failed to import config:", err);
        //     });
        // });
    }

    private async _setupTestConfig(): Promise<void> {
        this.logger.info("No persisted config found, loading test config...");

        // Consumers are managed by LifecycleConfig — MQTT broker is enabled by default.

        const producer = new AtemNetClientTallyProducer({
            id: "atem1",
            name: "ATEM-TVSHD",
            host: "127.0.0.1",
        });

        await this.lifecycle.addProducer(producer);
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
        process.on("exit", () => { CoreDatabase.destroy(); }); // Sync safety net — covers crashes and paths that bypass shutdown()
        process.on("uncaughtException", (err) => { this.logger.fatal("Uncaught exception", err); });
        process.on("unhandledRejection", (reason) => { this.logger.fatal("Unhandled rejection", reason); });
    }
}
