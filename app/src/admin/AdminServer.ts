import { EventEmitter } from "events";
import express from "express";
import ViteExpress from "vite-express";
import { Logger } from "../logging/Logger";
import type { ProducerConfig } from "../tally/producer/AbstractTallyProducer";
import type { ConsumerConfig } from "../tally/consumer/AbstractConsumer";

export interface AdminState {
    producers: { id: string; type: string; config: ProducerConfig }[];
    consumers: { id: string; type: string; config: ConsumerConfig }[];
}

export interface AdminServerEvents {
    remove_producer: [id: string];
    remove_consumer: [id: string];
}

export class AdminServer extends EventEmitter<AdminServerEvents> {

    private app = express();
    private logger = new Logger(["ADMIN"]);
    private state: AdminState = { producers: [], consumers: [] };

    public setState(state: AdminState): void {
        this.state = state;
    }

    public start(port: number = 3000): void {
        this.app.use(express.json());
        ViteExpress.config({ verbosity: ViteExpress.Verbosity.Silent });
        this._registerRoutes();
        ViteExpress.listen(this.app, port, () => {
            this.logger.info(`Admin server running on http://localhost:${port}`);
        });
    }

    private _registerRoutes(): void {
        this.app.get("/api/producers", (_req, res) => {
            res.json(this.state.producers);
        });

        this.app.get("/api/consumers", (_req, res) => {
            res.json(this.state.consumers);
        });

        this.app.delete("/api/producers/:id", (req, res) => {
            this.emit("remove_producer", req.params.id);
            res.status(204).send();
        });

        this.app.delete("/api/consumers/:id", (req, res) => {
            this.emit("remove_consumer", req.params.id);
            res.status(204).send();
        });
    }
}
