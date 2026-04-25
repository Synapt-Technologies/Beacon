import { TallyLifecycle } from "./tally/TallyLifecycle";
import { Logger } from "./logging/Logger";
import { AdminServer } from "./admin/AdminServer";
import { CoreDatabase } from "./database/CoreDatabase";
import { UpdateManager } from "./system/UpdateManager";


export interface CoreInfo {
    startTime: number;
}

export class AppCore {

    private lifecycle:     TallyLifecycle;
    private updateManager: UpdateManager;
    private admin:         AdminServer;
    private logger = new Logger(["CORE"]);

    private info: CoreInfo = {
        startTime: Date.now()
    };

    constructor() {
        this.lifecycle     = new TallyLifecycle();
        this.updateManager = new UpdateManager();
        this.admin         = new AdminServer(this.updateManager);
    }

    public async start(): Promise<void> {

        this.logger.info("Starting Beacon...");

        this._registerShutdownHandlers();
        try {
            await this.lifecycle.boot();
        } catch (error) {
            this.logger.fatal("Failed to start Lifecycle.", error);
        }
        
        try {
            this._wireAdminServer();

            this.admin.start();

        } catch (error) {
            this.logger.fatal("Failed to start admin server.", error);
        }

        this.updateManager.checkForUpdates().catch((reason) => {
            this.logger.error("Failed to check for updates.", reason);
        });
        // setInterval(() => this.updateManager.checkForUpdates().catch(() => {}), 60 * 60 * 1000).unref();

        this.logger.info("Beacon started.");
    }

    private _wireAdminServer(): void {

        const syncState = () => {
            this.admin.setState({
                producers:          this.lifecycle.getProducers(),
                consumers:          this.lifecycle.getConfig().consumers,
                devices:            this.lifecycle.getDevices(),
                orchestratorConfig: this.lifecycle.getOrchestratorConfig(),
                info:               this.lifecycle.getInfo().system
            });
        };

        const wireOrchestrator = () => {
            const orchestrator = this.lifecycle.getOrchestrator();
            orchestrator.on("producer_added",    syncState);
            orchestrator.on("producer_removed",  syncState);
            orchestrator.on("consumer_added",    syncState);
            orchestrator.on("consumer_removed",  syncState);
            orchestrator.on("producer_info",     syncState);
        };

        wireOrchestrator();
        syncState();

        this.admin.setHandlers({

            // ? Producers

            addProducer: async (type, config) => {
                await this.lifecycle.addProducer(type, config);
                syncState();
            },
            updateProducer: async (id, type, config) => {
                await this.lifecycle.updateProducer(id, type, config);
                syncState();
            },
            removeProducer: async (id) => {
                await this.lifecycle.removeProducer(id);
                syncState();
            },
            setProducerEnabled: async (id, enabled) => {
                await this.lifecycle.setProducerEnabled(id, enabled);
                syncState();
            },

            // ? Consumers

            updateConsumer: async (update) => {
                await this.lifecycle.updateConsumer(update);
                syncState();
            },

            // ? Devices

            patchDevice: (address, patch) => {
                this.lifecycle.patchDevice(address, patch);
                syncState();
            },
            renameDevice: (address, name) => {
                this.lifecycle.renameDevice(address, name);
                syncState();
            },
            removeDevice: (address) => {
                this.lifecycle.removeDevice(address);
                syncState();
            },
            sendAlert: (address, type, target, time) => {
                this.lifecycle.sendAlert(address, type, target, time);
            },

            // ? Config

            updateOrchestrator: async (config) => {
                await this.lifecycle.updateOrchestratorConfig(config);
                syncState();
            },
            restoreDatabase: async (backup) => {
                CoreDatabase.getInstance().importDatabase(backup);
                await this.lifecycle.reload();
                wireOrchestrator();
                this.admin.reloadUIConfig();
                syncState();
            },
            resetDatabase: async () => {
                CoreDatabase.getInstance().clearDatabase();
                await this.lifecycle.reload();
                wireOrchestrator();
                this.admin.reloadUIConfig();
                syncState();
            },

        });
    }

    private _registerShutdownHandlers(): void {
        let isShuttingDown = false;

        const shutdown = async (signal: NodeJS.Signals | "INTERNAL" | "UNKNOWN" = "UNKNOWN") => {
            if (isShuttingDown) 
                return;
            isShuttingDown = true;

            this.logger.info("Shutting down. Signal:", signal, "Uptime:", ((Date.now() - this.info.startTime) / 1000).toFixed(2), "seconds.");
            
            const forceQuit = setTimeout(() => {
                this.logger.fatal("Shutdown timed out, forcing exit.");
                process.exit(1);
            }, 4000); 
            forceQuit.unref();

            try {
                this.logger.info("Stopping lifecycle services...");
                await this.lifecycle.shutdown();
                this.logger.info("Services stopped. Closing database...");

                CoreDatabase.destroy(); 
                
                this.logger.info("Shutdown complete.");
                process.exit(0);
            } catch (err) {
                this.logger.error("Error during shutdown:", err);
                process.exit(1);
            }
        };

        process.prependListener("SIGINT",  () => { void shutdown("SIGINT"); });
        process.prependListener("SIGTERM", () => { void shutdown("SIGTERM"); });
        process.prependListener("SIGHUP",  () => { void shutdown("SIGHUP"); });

        process.on("beforeExit", (code) => {
            this.logger.warn(`beforeExit event with code=${code} after ${((Date.now() - this.info.startTime) / 1000).toFixed(2)} seconds uptime.`);
        });

        process.on("exit", (code) => {
            this.logger.warn(`exit event with code=${code} after ${((Date.now() - this.info.startTime) / 1000).toFixed(2)} seconds uptime.`);
        });
        
        process.on("uncaughtException", (err) => { this.logger.fatal("Uncaught exception", err); });
        process.on("unhandledRejection", (reason) => { this.logger.fatal("Unhandled rejection", reason); });
    }
}
