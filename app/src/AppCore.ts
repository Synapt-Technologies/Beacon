import { TallyLifecycle } from "./tally/TallyLifecycle";
import { AedesNetworkConsumer } from "./tally/consumer/networkConsumer/AedesNetworkConsumer";
import { AtemNetClientTallyProducer } from "./tally/producer/networkProducer/AtemNetClientTallyProducer";
import { Logger } from "./logging/Logger";
import { AdminServer } from "./admin/AdminServer";

export class AppCore {

    private lifecycle: TallyLifecycle;
    private admin = new AdminServer();
    private logger = new Logger(["CORE"]);

    constructor() {
        this.lifecycle = new TallyLifecycle({});
    }

    public async start(): Promise<void> {
        this.logger.info("Starting Beacon...");

        await this.lifecycle.boot();
        this.admin.start();

        // TODO: Remove once the ui can configure producers and consumers.
        if (!this.lifecycle.hasConfig()) {
            await this._setupTestConfig();
        }

        this._registerShutdownHandlers();

        this.logger.info("Beacon started.");
    }

    private async _setupTestConfig(): Promise<void> {
        this.logger.info("No persisted config found, loading test config...");

        const consumer = new AedesNetworkConsumer({
            id: "aedes",
            name: "AEDES",
            keep_alive_ms: 5000,
            broadcast_all: true,
        });

        await this.lifecycle.addConsumer(consumer);

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
            process.exit(0);
        };

        process.prependListener("SIGINT", shutdown);
        process.prependListener("SIGTERM", shutdown);
    }
}
