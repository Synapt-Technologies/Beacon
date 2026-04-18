import express from "express";
import ViteExpress from "vite-express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Logger } from "../logging/Logger";
import type { ProducerConfig } from "../tally/producer/AbstractTallyProducer";
import type { ConsumerUpdate, LifecycleConfig } from "../tally/TallyLifecycle";
import  { type DeviceAddress,  DeviceAlertState, DeviceAlertTarget, type DeviceName, type TallyDevice } from "../tally/types/ConsumerStates";
import type { GlobalTallySource, ProducerBundle, ProducerId } from "../tally/types/ProducerStates";
import type { OrchestratorConfig } from "../tally/TallyLifecycle";
import type { SystemInfo } from "../types/SystemInfo";
import { UpdateManager } from "../system/UpdateManager";

const PROD_BIND_HOST = "0.0.0.0";

export interface AdminState {
    producers: ProducerBundle[];
    consumers: LifecycleConfig["consumers"];
    devices: Map<string, TallyDevice[]>;
    orchestratorConfig: Partial<OrchestratorConfig>;
    info: SystemInfo;
}

export interface AdminMutationHandlers {
    addProducer:    (type: string, config: ProducerConfig) => Promise<void>
    updateProducer: (id: ProducerId, type: string, config: ProducerConfig) => Promise<void>
    removeProducer: (id: ProducerId) => Promise<void>

    updateConsumer: (update: ConsumerUpdate) => Promise<void>

    patchDevice:  (address: DeviceAddress, patch: GlobalTallySource[]) => void
    renameDevice: (address: DeviceAddress, name: DeviceName) => void
    removeDevice: (address: DeviceAddress) => void
    sendAlert:    (address: DeviceAddress, type: DeviceAlertState, target: DeviceAlertTarget, time: number) => void

    updateOrchestrator: (config: Partial<OrchestratorConfig>) => Promise<void>
    importConfig:       (config: LifecycleConfig) => Promise<void>
}

export class AdminServer {

    private app = express();
    private logger = new Logger(["ADMIN"]);
    private _ready = false;
    private _diagRequestLogsRemaining = 60;
    private _readyProbeLogsRemaining = 20;
    private _diagSuppressedLogged = false;
    private state: AdminState = {
        producers: [],
        consumers: undefined,
        devices: new Map(),
        orchestratorConfig: {},
        info: {}
    };
    private handlers!: AdminMutationHandlers;
    private updateManager: UpdateManager;

    constructor(updateManager: UpdateManager) {
        this.updateManager = updateManager;
    }

    public setState(state: AdminState): void {
        this.state = state;
    }

    public setHandlers(handlers: AdminMutationHandlers): void {
        this.handlers = handlers;
    }

    public start(port: number = 80): void {
        const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        this.logger.info(`Starting admin HTTP stack (mode=${mode}, pid=${process.pid}, cwd=${process.cwd()}, port=${port})`);

        this.app.use(express.json());
        this._registerDiagnostics();
        this._registerRoutes();

        if (process.env.NODE_ENV === 'production') {
            this._registerProductionUiRoutes();
            const server = this.app.listen(port, PROD_BIND_HOST, () => {
                this._ready = true;
                this.logger.info(`Admin server running on 0.0.0.0:${port} (mode=production)`);

                const address = server.address();
                if (address && typeof address === "object") {
                    this.logger.info(`Admin listener bound to ${address.address}:${address.port} (${address.family})`);
                }
            });

            server.on("error", (err) => {
                this.logger.error("Admin server failed to start:", err);
            });
            return;
        }

        ViteExpress.config({
            verbosity: ViteExpress.Verbosity.Silent,
            mode: 'development',
        });

        const server = ViteExpress.listen(this.app, port, () => {
            this._ready = true;
            this.logger.info(`Admin server running on http://localhost:${port} (mode=development)`);

            const address = server.address();
            if (address && typeof address === "object") {
                this.logger.info(`Admin listener bound to ${address.address}:${address.port} (${address.family})`);
            }
        });

        server.on("error", (err) => {
            this.logger.error("Admin server failed to start:", err);
        });
    }

    private _registerDiagnostics(): void {
        this.app.use((req, res, next) => {
            const shouldLog = this._diagRequestLogsRemaining > 0;
            const started = Date.now();

            if (shouldLog) {
                this._diagRequestLogsRemaining--;
            }

            res.on("finish", () => {
                if (shouldLog) {
                    this.logger.info(`HTTP ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms) from ${req.ip}`);
                } else if (!this._diagSuppressedLogged) {
                    this._diagSuppressedLogged = true;
                    this.logger.info("Startup HTTP request diagnostics suppressed after initial sample.");
                }
            });

            next();
        });
    }

    private _registerProductionUiRoutes(): void {
        const uiDistPath = join(process.cwd(), "dist", "ui");

        if (!existsSync(uiDistPath)) {
            this.logger.error(`Production UI build not found at: ${uiDistPath}`);
            this.app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
                res.status(503).json({
                    error: "Web UI is unavailable: dist build missing. Run yarn build.",
                });
            });
            return;
        }

        this.app.use(express.static(uiDistPath, {
            setHeaders: (res, filePath) => {
                // Always revalidate HTML so clients don't keep stale index.html
                // after an OTA update with new hashed asset filenames.
                if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                }
            },
        }));

        // Non-API navigation requests are served by the SPA entrypoint.
        // Requests that look like static assets (have an extension) should not
        // receive index.html, otherwise browsers may parse HTML as JS/CSS.
        this.app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
            const acceptsHtml = req.accepts('html');
            const hasExtension = req.path.lastIndexOf('.') > req.path.lastIndexOf('/');

            if (!acceptsHtml || hasExtension) {
                res.status(404).send();
                return;
            }

            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.sendFile(join(uiDistPath, "index.html"));
        });
    }

    private _registerRoutes(): void {

        // API responses are dynamic; prevent cache revalidation/304 responses
        // that can confuse the UI's JSON bootstrap/update flow after restarts.
        this.app.use("/api", (req, res, next) => {
            delete req.headers["if-none-match"];
            delete req.headers["if-modified-since"];

            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");

            next();
        });

        // ? Readiness — only 200 once ViteExpress middleware is fully set up
        this.app.get("/api/ready", (req, res) => {
            const code = this._ready ? 204 : 503;

            if (this._readyProbeLogsRemaining > 0) {
                this._readyProbeLogsRemaining--;
                this.logger.info(`Readiness probe from ${req.ip} -> ${code}`);
            }

            res.status(code).send();
        });

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
            const patch: GlobalTallySource[] = req.body.patch;
            if (!Array.isArray(patch)) {
                res.status(400).json({ error: "patch must be an array" });
                return;
            }
            this.handlers.patchDevice({ consumer, device }, patch);
            res.status(204).send();
            this.logger.info(`Device patched:`, { consumer, device }, patch);
        });

        this.app.patch("/api/devices/:consumer/:device/name", (req, res) => {
            const { consumer, device } = req.params;
            const name: DeviceName = req.body.name;
            if (!name?.long) {
                res.status(400).json({ error: "name.long is required" });
                return;
            }
            this.handlers.renameDevice({ consumer, device }, name);
            res.status(204).send();
            this.logger.info(`Device renamed:`, { consumer, device }, name);
        });

        this.app.delete("/api/devices/:consumer/:device", (req, res) => {
            const { consumer, device } = req.params;
            this.handlers.removeDevice({ consumer, device });
            res.status(204).send();
            this.logger.info(`Device removed:`, { consumer, device });
        });

        this.app.post("/api/devices/:consumer/:device/alert", (req, res) => {
            const { consumer, device } = req.params;
            const { type, target, time } = req.body;
            if (type === undefined || target === undefined || time === undefined) {
                res.status(400).json({ error: "type, target, and time are required" });
                return;
            }
            this.handlers.sendAlert({ consumer, device }, type as DeviceAlertState, target as DeviceAlertTarget, time);
            res.status(204).send();
            this.logger.info(`Device alert sent:`, { consumer, device }, DeviceAlertState[type], DeviceAlertTarget[target]);
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

            const userAgent = req.get("user-agent") ?? "unknown";
            this.logger.warn(`Update apply requested by ${req.ip} (${userAgent}) -> ${type} \"${ref}\"`);

            res.status(204).send();
            this.updateManager.applyUpdate(ref, type).catch((err) => {
                this.logger.error("Update failed:", err);
            });
            this.logger.info(`Update requested: ${type} "${ref}"`);
        });
    }
}
