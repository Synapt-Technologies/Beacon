import { TallyLifecycle } from "./tally/TallyLifecycle";
import { AedesNetworkConsumer } from "./tally/consumer/networkConsumer/AedesNetworkConsumer";
import { AtemNetClientTallyProducer } from "./tally/producer/networkProducer/AtemNetClientTallyProducer";
import { Logger } from "./logging/Logger";

export class AppCore {

    private lifecycle: TallyLifecycle;
    private logger = new Logger(["AppCore"]);

    constructor() {
        this.lifecycle = new TallyLifecycle({});
    }

    public async start(): Promise<void> {
        this.logger.info("Starting Beacon...");

        await this.lifecycle.boot();

        // TODO: Remove once the ui can configure producers and consumers.
        await this._setupTestConfig();

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
            // TODO: call destroy on lifecycle once implemented
            process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    }
}
