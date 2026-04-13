import { EventEmitter } from "events";
import express from "express";
import ViteExpress from "vite-express";
import { Logger } from "../logging/Logger";
import type { ProducerConfig } from "../tally/producer/AbstractTallyProducer";
import type { ConsumerUpdate, LifecycleConfig } from "../tally/TallyLifecycle";
import  { type DeviceAddress,  DeviceAlertState, DeviceAlertTarget, type DeviceName, type TallyDevice } from "../tally/types/ConsumerStates";
import type { GlobalTallySource, ProducerBundle, ProducerId } from "../tally/types/ProducerStates";
import type { OrchestratorConfig } from "../tally/TallyLifecycle";
import type { SystemInfo } from "../types/SystemInfo";

export interface AdminState {
    producers: ProducerBundle[];
    consumers: LifecycleConfig["consumers"];
    devices: Map<string, TallyDevice[]>;
    orchestratorConfig: Partial<OrchestratorConfig>;
    info: SystemInfo;
}

export interface AdminServerEvents {
    add_producer:    [type: string, config: ProducerConfig];
    update_producer: [id: ProducerId, type: string, config: ProducerConfig];
    remove_producer: [id: ProducerId];

    update_consumer: [update: ConsumerUpdate];

    patch_device:  [address: DeviceAddress, patch: GlobalTallySource[]];
    rename_device: [address: DeviceAddress, name: DeviceName];
    remove_device: [address: DeviceAddress];
    send_alert:    [address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget];

    import_config: [config: LifecycleConfig];

    update_orchestrator: [config: Partial<OrchestratorConfig>];
}

export class AdminServer extends EventEmitter<AdminServerEvents> {

    private app = express();
    private logger = new Logger(["ADMIN"]);
    private state: AdminState = { 
        producers: [], 
        consumers: undefined, 
        devices: new Map(), 
        orchestratorConfig: {},
        info: {}
    };

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

        // ? Producers

        this.app.get("/api/info", (_req, res) => {
            res.json(this.state.info);
        });

        this.app.get("/api/producers", (_req, res) => {
            const parsed = this.state.producers.map(p => ({
                ...p,
                info: { ...p.info, sources: Object.fromEntries(p.info?.sources || {}) }
            }));
            res.json(parsed);
        });

        this.app.post("/api/producers", (req, res) => {
            const { type, config } = req.body;
            if (!type || !config?.id) {
                res.status(400).json({ error: "type and config.id are required" });
                return;
            }
            this.emit("add_producer", type, config as ProducerConfig);
            res.status(204).send();
            this.logger.info(`Producer add requested:`, type, config.id);
        });

        this.app.patch("/api/producers/:id", (req, res) => {
            const id = req.params.id;
            const { type, config } = req.body;
            if (!type || !config) {
                res.status(400).json({ error: "type and config are required" });
                return;
            }
            this.emit("update_producer", id, type, { ...config, id } as ProducerConfig);
            res.status(204).send();
            this.logger.info(`Producer update requested:`, id);
        });

        this.app.delete("/api/producers/:id", (req, res) => {
            this.emit("remove_producer", req.params.id);
            res.status(204).send();
            this.logger.info(`Producer delete requested:`, req.params.id);
        });

        // ? Consumers

        this.app.get("/api/consumers", (_req, res) => {
            res.json(this.state.consumers);
        });

        this.app.patch("/api/consumers/:id", (req, res) => {
            const id = req.params.id;
            if (!this.state.consumers || !(id in this.state.consumers)) {
                res.status(400).json({ error: `Unknown consumer: ${id}` });
                return;
            }
            this.emit("update_consumer", { id, ...req.body } as ConsumerUpdate);
            res.status(204).send();
            this.logger.info(`Consumer update requested:`, id, req.body);
        });

        // ? Devices

        this.app.get("/api/devices", (_req, res) => {
            res.json(Object.fromEntries(this.state.devices));
        });

        this.app.patch("/api/devices/:consumer/:device/patch", (req, res) => {
            const { consumer, device } = req.params;
            const patch: GlobalTallySource[] = req.body.patch;
            if (!Array.isArray(patch)) {
                res.status(400).json({ error: "patch must be an array" });
                return;
            }
            this.emit("patch_device", { consumer, device }, patch);
            res.status(204).send();
            this.logger.info(`Device patch requested:`, { consumer, device }, patch);
        });

        this.app.patch("/api/devices/:consumer/:device/name", (req, res) => {
            const { consumer, device } = req.params;
            const name: DeviceName = req.body.name;
            if (!name?.long) {
                res.status(400).json({ error: "name.long is required" });
                return;
            }
            this.emit("rename_device", { consumer, device }, name);
            res.status(204).send();
            this.logger.info(`Device rename requested:`, { consumer, device }, name);
        });

        this.app.delete("/api/devices/:consumer/:device", (req, res) => {
            const { consumer, device } = req.params;
            this.emit("remove_device", { consumer, device });
            res.status(204).send();
            this.logger.info(`Device delete requested:`, { consumer, device });
        });

        this.app.post("/api/devices/:consumer/:device/alert", (req, res) => {
            const { consumer, device } = req.params;
            const { type, target } = req.body;
            if (type === undefined || target === undefined) {
                res.status(400).json({ error: "type and target are required" });
                return;
            }
            this.emit("send_alert", { consumer, device }, type as DeviceAlertState, target as DeviceAlertTarget);
            res.status(204).send();
            this.logger.info(`Device alert requested:`, { consumer, device }, DeviceAlertState[type], DeviceAlertTarget[target]);
        });

        // ? Config

        this.app.get("/api/config/export", (_req, res) => {
            const producers = this.state.producers.map(({ type, config }) => ({ type, config }));
            res.json({ producers, consumers: this.state.consumers });
        });

        this.app.post("/api/config/import", (req, res) => {
            this.emit("import_config", req.body as LifecycleConfig);
            res.status(204).send();
            this.logger.info(`Config import requested.`);
        });

        // ? Orchestrator config

        this.app.get("/api/config/orchestrator", (_req, res) => {
            res.json(this.state.orchestratorConfig);
        });

        this.app.patch("/api/config/orchestrator", (req, res) => {
            this.emit("update_orchestrator", req.body as Partial<OrchestratorConfig>);
            res.status(204).send();
            this.logger.info(`Orchestrator config update requested:`, req.body);
        });
    }
}
