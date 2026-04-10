import { EventEmitter } from "events";
import express from "express";
import ViteExpress from "vite-express";
import { Logger } from "../logging/Logger";
import type { ProducerConfig, ProducerInfo } from "../tally/producer/AbstractTallyProducer";
import type { ConsumerUpdate, LifecycleConfig } from "../tally/TallyLifecycle";
import type { TallyDevice } from "../tally/types/ConsumerStates";

export interface AdminState {
    producers: { type: string, config: ProducerConfig, info: ProducerInfo }[];
    consumers: LifecycleConfig["consumers"];
    devices: Map<string, TallyDevice[]>;
}

export interface AdminServerEvents {
    remove_producer: [id: string];
    update_consumer: [update: ConsumerUpdate];
    import_config:   [config: LifecycleConfig];
}

export class AdminServer extends EventEmitter<AdminServerEvents> {

    private app = express();
    private logger = new Logger(["ADMIN"]);
    private state: AdminState = { producers: [], consumers: undefined, devices: new Map() };

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

            const parsedState = this.state.producers.map((origin) => { // TODO Better serialisation
                return {
                    ...origin,
                    info: {
                        ...origin.info,
                        sources: Object.fromEntries(origin.info.sources)
                    }
                }
            })

            res.json(parsedState);
        });

        this.app.get("/api/consumers", (_req, res) => {
            res.json(this.state.consumers);
        });

        this.app.delete("/api/producers/:id", (req, res) => {
            this.emit("remove_producer", req.params.id);
            res.status(204).send();
        });

        this.app.patch("/api/consumers/:id", (req, res) => {
            const id = req.params.id;
            if (id !== "aedes" && id !== "gpio") {
                res.status(400).json({ error: `Unknown consumer: ${id}` });
                return;
            }
            this.emit("update_consumer", { id, ...req.body } as ConsumerUpdate);
            res.status(204).send();
        });

        this.app.get("/api/devices", (req, res) => {
            const output = Object.fromEntries(this.state.devices);
            res.json(output);
        });

        this.app.get("/api/config/export", (_req, res) => {
            res.json({ consumers: this.state.consumers, producers: this.state.producers }); // TODO better formatting
        });

        this.app.post("/api/config/import", (req, res) => {
            this.emit("import_config", req.body as LifecycleConfig);
            res.status(204).send();
        });
    }
}
