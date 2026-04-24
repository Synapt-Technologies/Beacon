import express from "express";
import ViteExpress from "vite-express";
import { Logger } from "../logging/Logger";
import type { ProducerConfig } from "../tally/producer/AbstractTallyProducer";
import type { ConsumerUpdate, LifecycleConfig } from "../tally/TallyLifecycle";
import  { type DeviceAddress, DeviceAlertAction, DeviceAlertTarget, type DeviceName, type TallyDevice } from "../tally/types/DeviceTypes";
import type { GlobalSource } from "../tally/types/SourceTypes";
import type { ProducerBundle, ProducerId } from "../tally/types/ProducerTypes";
import type { OrchestratorConfig } from "../tally/TallyLifecycle";
import { HardwareVersion, type SystemInfo } from "../types/SystemInfo";
import { UpdateManager } from "../system/UpdateManager";
import { CoreDatabase, SettingKey } from "../database/CoreDatabase";
import { type UIConfig, DEFAULT_UI_ALERT_CONFIG } from "../types/UIStates";

export interface AdminState {
    producers: ProducerBundle[];
    consumers: LifecycleConfig["consumers"];
    devices: Map<string, TallyDevice[]>;
    orchestratorConfig: Partial<OrchestratorConfig>;
    info: SystemInfo;
}

export interface AdminMutationHandlers {
    addProducer:        (type: string, config: ProducerConfig) => Promise<void>
    updateProducer:     (id: ProducerId, type: string, config: ProducerConfig) => Promise<void>
    removeProducer:     (id: ProducerId) => Promise<void>
    setProducerEnabled: (id: ProducerId, enabled: boolean) => Promise<void>

    updateConsumer: (update: ConsumerUpdate) => Promise<void>

    patchDevice:  (address: DeviceAddress, patch: GlobalSource[]) => void
    renameDevice: (address: DeviceAddress, name: DeviceName) => void
    removeDevice: (address: DeviceAddress) => void
    sendAlert:    (address: DeviceAddress, type: DeviceAlertAction, target: DeviceAlertTarget, time: number) => void

    updateOrchestrator: (config: Partial<OrchestratorConfig>) => Promise<void>
    importConfig:       (config: LifecycleConfig) => Promise<void>
}

export class AdminServer {

    private app = express();
    private logger = new Logger(["ADMIN"]);
    private state: AdminState = {
        producers: [],
        consumers: undefined,
        devices: new Map(),
        orchestratorConfig: {},
        info: {
            hardware: HardwareVersion.UNKNOWN
        }
    };
    private handlers!: AdminMutationHandlers;
    private updateManager: UpdateManager;
    private _sseClients: Set<express.Response> = new Set();
    private _uiConfig: UIConfig = { alerts: DEFAULT_UI_ALERT_CONFIG };

    constructor(updateManager: UpdateManager) {
        this.updateManager = updateManager;
        const stored = CoreDatabase.getInstance().getSetting(SettingKey.ui);
        if (stored) this._uiConfig = stored;
    }

    private _serializeState() {
        return {
            producers: this.state.producers.map(p => ({
                ...p,
                info: { ...p.info, sources: Object.fromEntries(p.info?.sources || {}) }
            })),
            consumers: this.state.consumers,
            devices: Object.fromEntries(this.state.devices),
            orchestratorConfig: this.state.orchestratorConfig,
            info: this.state.info,
            uiConfig: this._uiConfig,
        };
    }

    private _broadcast(): void {
        if (this._sseClients.size === 0) return;
        const data = `data: ${JSON.stringify(this._serializeState())}\n\n`;
        for (const res of this._sseClients) res.write(data);
    }

    public setState(state: AdminState): void {
        this.state = state;
        this._broadcast();
    }

    public setHandlers(handlers: AdminMutationHandlers): void {
        this.handlers = handlers;
    }

    public start(port: number = 80): void {

        this.logger.info("Starting admin server...");

        this.app.use(express.json());

        //TODO: Serve static ui in production?
        ViteExpress.config({ 
            verbosity: ViteExpress.Verbosity.Silent,
            mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
        });
        this._registerRoutes();
        ViteExpress.listen(this.app, port, () => {
            this.logger.info(`Admin server running on http://localhost:${port}`);
        });

        this.logger.info("Admin server started.");
    }

    private _registerRoutes(): void {

        // ? Producers

        this.app.get("/api/info", (_req, res) => {
            res.json(this.state.info);
        });

        this.app.get("/api/events", (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();
            res.write(`data: ${JSON.stringify(this._serializeState())}\n\n`);
            this._sseClients.add(res);
            const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
            req.on('close', () => {
                clearInterval(ping);
                this._sseClients.delete(res);
            });
        });

        this.app.get("/api/producers", (_req, res) => {
            res.json(this._serializeState().producers);
        });

        this.app.post("/api/producers", async (req, res) => {
            const { type, config } = req.body;
            if (!type || !config?.id) {
                res.status(400).json({ error: "type and config.id are required" });
                return;
            }
            try {
                await this.handlers.addProducer(type, config as ProducerConfig);
                res.status(204).send();
                this.logger.info(`Producer added:`, type, config.id);
            } catch (e) {
                this.logger.error("Failed to add producer:", e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to add producer" });
            }
        });

        this.app.patch("/api/producers/:id", async (req, res) => {
            const id = req.params.id;
            const { type, config } = req.body;
            if (!type || !config) {
                res.status(400).json({ error: "type and config are required" });
                return;
            }
            try {
                await this.handlers.updateProducer(id, type, { ...config, id } as ProducerConfig);
                res.status(204).send();
                this.logger.info(`Producer updated:`, id);
            } catch (e) {
                this.logger.error("Failed to update producer:", id, e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to update producer" });
            }
        });

        this.app.patch("/api/producers/:id/enabled", async (req, res) => {
            const id = req.params.id;
            const { enabled } = req.body;
            if (typeof enabled !== 'boolean') {
                res.status(400).json({ error: "enabled must be a boolean" });
                return;
            }
            try {
                await this.handlers.setProducerEnabled(id, enabled);
                res.status(204).send();
                this.logger.info(`Producer ${enabled ? 'enabled' : 'disabled'}:`, id);
            } catch (e) {
                this.logger.error("Failed to set producer enabled:", id, e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to update producer" });
            }
        });

        this.app.delete("/api/producers/:id", async (req, res) => {
            const id = req.params.id;
            try {
                await this.handlers.removeProducer(id);
                res.status(204).send();
                this.logger.info(`Producer removed:`, id);
            } catch (e) {
                this.logger.error("Failed to remove producer:", id, e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to remove producer" });
            }
        });

        // ? Consumers

        this.app.get("/api/consumers", (_req, res) => {
            res.json(this.state.consumers);
        });

        this.app.patch("/api/consumers/:id", async (req, res) => {
            const id = req.params.id;
            if (!this.state.consumers || !(id in this.state.consumers)) {
                res.status(400).json({ error: `Unknown consumer: ${id}` });
                return;
            }
            try {
                await this.handlers.updateConsumer({ id, ...req.body } as ConsumerUpdate);
                res.status(204).send();
                this.logger.info(`Consumer updated:`, id, req.body);
            } catch (e) {
                this.logger.error("Failed to update consumer:", id, e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to update consumer" });
            }
        });

        // ? Devices

        this.app.get("/api/devices", (_req, res) => {
            res.json(Object.fromEntries(this.state.devices));
        });

        this.app.patch("/api/devices/:consumer/:device/patch", (req, res) => {
            const { consumer, device } = req.params;
            const patch: GlobalSource[] = req.body.patch;
            if (!Array.isArray(patch)) {
                res.status(400).json({ error: "patch must be an array" });
                return;
            }
            try {
                this.handlers.patchDevice({ consumer, device }, patch);
                res.status(204).send();
                this.logger.info(`Device patched:`, { consumer, device }, patch);
            } catch (e) {
                this.logger.error("Failed to patch device:", e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to patch device" });
            }
        });

        this.app.patch("/api/devices/:consumer/:device/name", (req, res) => {
            const { consumer, device } = req.params;
            const name: DeviceName = req.body.name;
            if (!name?.long) {
                res.status(400).json({ error: "name.long is required" });
                return;
            }
            try {
                this.handlers.renameDevice({ consumer, device }, name);
                res.status(204).send();
                this.logger.info(`Device renamed:`, { consumer, device }, name);
            } catch (e) {
                this.logger.error("Failed to rename device:", e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to rename device" });
            }
        });

        this.app.delete("/api/devices/:consumer/:device", (req, res) => {
            const { consumer, device } = req.params;
            try {
                this.handlers.removeDevice({ consumer, device });
                res.status(204).send();
                this.logger.info(`Device removed:`, { consumer, device });
            } catch (e) {
                this.logger.error("Failed to remove device:", e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to remove device" });
            }
        });

        this.app.post("/api/devices/:consumer/:device/alert", (req, res) => {
            const { consumer, device } = req.params;
            const { type, target, time } = req.body;
            if (type === undefined || target === undefined || time === undefined) {
                res.status(400).json({ error: "type, target, and time are required" });
                return;
            }
            try {
                this.handlers.sendAlert({ consumer, device }, type as DeviceAlertAction, target as DeviceAlertTarget, time);
                res.status(204).send();
                this.logger.info(`Device alert sent:`, { consumer, device }, DeviceAlertAction[type], DeviceAlertTarget[target]);
            } catch (e) {
                this.logger.error("Failed to send device alert:", e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to send alert" });
            }
        });

        // ? Config

        this.app.get("/api/config/export", (_req, res) => {
            const producers = this.state.producers.map(({ type, config }) => ({ type, config }));
            res.json({ producers, consumers: this.state.consumers });
        });

        this.app.post("/api/config/import", async (req, res) => {
            try {
                await this.handlers.importConfig(req.body as LifecycleConfig);
                res.status(204).send();
                this.logger.info(`Config imported.`);
            } catch (e) {
                this.logger.error("Failed to import config:", e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to import config" });
            }
        });

        // ? Orchestrator config

        this.app.get("/api/config/orchestrator", (_req, res) => {
            res.json(this.state.orchestratorConfig);
        });

        this.app.patch("/api/config/orchestrator", async (req, res) => {
            try {
                await this.handlers.updateOrchestrator(req.body as Partial<OrchestratorConfig>);
                res.status(204).send();
                this.logger.info(`Orchestrator config updated:`, req.body);
            } catch (e) {
                this.logger.error("Failed to update orchestrator config:", e);
                res.status(500).json({ error: e instanceof Error ? e.message : "Failed to update orchestrator config" });
            }
        });

        // ? UI config

        this.app.get("/api/config/ui", (_req, res) => {
            res.json(this._uiConfig);
        });

        this.app.patch("/api/config/ui", (req, res) => {
            this._uiConfig = { ...this._uiConfig, ...req.body as Partial<UIConfig> };
            CoreDatabase.getInstance().setSetting(SettingKey.ui, this._uiConfig);
            this._broadcast();
            this.logger.info(`UI config updated:`, this._uiConfig);
            res.status(204).send();
        });

        // ? Update

        this.app.get("/api/update/status", (_req, res) => {
            res.json(this.updateManager.getStatus());
        });

        this.app.post("/api/update/check", async (_req, res) => {
            const status = await this.updateManager.checkForUpdates();
            res.json(status);
        });

        this.app.post("/api/update/apply", (req, res) => {
            const { ref, type } = req.body as { ref: string; type: 'release' | 'branch' };
            if (!ref || !type) {
                res.status(400).json({ error: "ref and type are required" });
                return;
            }
            res.status(202).send();
            this.updateManager.applyUpdate(ref, type).catch((err) => {
                this.logger.error("Update failed:", err);
            });
            this.logger.info(`Update requested: ${type} "${ref}"`);
        });
    }
}
