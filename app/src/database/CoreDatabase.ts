import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'path';
import type { AbstractTallyProducer, ProducerConfig, ProducerInfo } from '../tally/producer/AbstractTallyProducer';
import { GlobalSourceTools, type ProducerBundle, type SourceInfo } from '../tally/types/ProducerStates';
import { DeviceTallyState, GlobalDeviceTools, type DeviceAddress, type TallyDevice } from '../tally/types/ConsumerStates';
import { Logger } from '../logging/Logger';
import type { LifecycleConfig, LifeCycleConsumerConfig } from '../tally/TallyLifecycle';
import { TallyOrchestrator, type OrchestratorConfig } from '../tally/TallyOrchestrator';
import type { UIAlertSlot } from '../types/UIStates';


export const SettingKey = {
    consumers: {
        aedes: "consumers.aedes",
        gpio: "consumers.gpio",
    },
    orchestrator: "orchestrator",
    ui: {
        alert: "ui.alert"
    }
    
} as const;

export type SettingKey = LeafValues<typeof SettingKey>;

type LeafValues<T> = T extends string
    ? T
    : { [K in keyof T]: LeafValues<T[K]> }[keyof T];


interface SettingMap { // ?Note: String if not set.
    consumers: {
        aedes: LifeCycleConsumerConfig;
        gpio: LifeCycleConsumerConfig;
    }
    orchestrator: OrchestratorConfig;
    ui: {
        alert: UIAlertSlot[];
    }
}

type SettingType<K extends string, T = SettingMap> =
    K extends `${infer Head}.${infer Tail}`
        ? Head extends keyof T ? SettingType<Tail, T[Head]> : never
        : K extends keyof T ? T[K] : never;



        
// TODO add more try catch.
export class CoreDatabase {
    private static instance: CoreDatabase;
    private db: Database.Database;

    private logger: Logger;

    private constructor() {
        const dbPath = path.join(process.cwd(), '/db/tally.db');
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL'); // High-performance mode
        this.init();
        this.logger = new Logger([
            "DB"
        ]);
        this.logger.info(`Database initialized at:`, dbPath);
    }
    
    public static getInstance(): CoreDatabase {
        if (!CoreDatabase.instance) {
            CoreDatabase.instance = new CoreDatabase();
        }
        return CoreDatabase.instance;
    }

    private init() {
        // Create tables
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS producers (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                config TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS producer_info (
                id TEXT PRIMARY KEY,
                info TEXT NOT NULL,
                FOREIGN KEY(id) REFERENCES producers(id) ON DELETE CASCADE
            );

            
            CREATE TABLE IF NOT EXISTS consumer_devices (
                id TEXT PRIMARY KEY,
                consumer_id TEXT NOT NULL,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            
        `);
    }


    // ? Producer Methods
    public saveProducer(producer: AbstractTallyProducer): void {
        const stmt = this.db.prepare(`
            INSERT INTO producers (id, type, config)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET config=excluded.config
        `);
        stmt.run(producer.getId(), producer.constructor.name, JSON.stringify(producer.getConfig()));
    }

    public getProducers(): Required<Omit<ProducerBundle, "info">>[] {
        const rows = this.db.prepare('SELECT * FROM producers').all() as { id: string, type: string, config: string }[];
        return rows.map(row => ({ type: row.type, config: JSON.parse(row.config) }));
    }

    public saveProducerInventory(id: string, info: ProducerInfo) {
        const serialized = { ...info, sources: Array.from(info.sources.values()) };
        const stmt = this.db.prepare(`
            INSERT INTO producer_info (id, info)
            VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET info=excluded.info
        `);
        stmt.run(id, JSON.stringify(serialized));
    }

    public getProducerInventory(id: string): ProducerInfo | null {
        const row = this.db.prepare('SELECT info FROM producer_info WHERE id = ?').get(id) as { info: string } | undefined;
        if (!row) return null;

        try {
            const parsed = JSON.parse(row.info);
            const sources = new Map<string, SourceInfo>(
                (parsed.sources ?? []).map((s: SourceInfo) => [
                    GlobalSourceTools.create(s.source.producer, s.source.source),
                    s
                ])
            );
            return { ...parsed, sources };
        } catch {
            this.logger.error(`Failed to parse producer inventory for:`, id);
            return null;
        }
    }

    public deleteProducer(id: string): void {
        this.db.prepare('DELETE FROM producers WHERE id = ?').run(id);
    }

    // ? Consumer Device Methods
    public saveConsumerDevices(devices: TallyDevice[]) {
        devices.forEach(device => this.saveConsumerDevice(device));
    }

    public saveConsumerDevice(device: TallyDevice) {
        const id = GlobalDeviceTools.create(device.id.consumer, device.id.device);
        const stmt = this.db.prepare(`
            INSERT INTO consumer_devices (id, consumer_id, data)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data=excluded.data
        `);
        stmt.run(id, device.id.consumer, JSON.stringify(device));
    }

    public getConsumerDevice(address: DeviceAddress): TallyDevice | null {
        const id = GlobalDeviceTools.create(address.consumer, address.device);
        const row = this.db.prepare('SELECT data FROM consumer_devices WHERE id = ?').get(id) as { data: string } | undefined;
        if (!row) return null;

        try {
            return { ...JSON.parse(row.data), state: DeviceTallyState.NONE };
        } catch {
            this.logger.error(`Failed to parse device with ID:`, id);
            return null;
        }
    }

    public deleteConsumerDevice(address: DeviceAddress): void {
        const id = GlobalDeviceTools.create(address.consumer, address.device);
        this.db.prepare('DELETE FROM consumer_devices WHERE id = ?').run(id);
    }

    public getConsumerDevices(consumerId: string): Map<string, TallyDevice> {
        const rows = this.db.prepare('SELECT id, data FROM consumer_devices WHERE consumer_id = ?').all(consumerId) as { id: string, data: string }[];

        const output = new Map<string, TallyDevice>();

        for (const row of rows) {
            try {
                const device: TallyDevice = { ...JSON.parse(row.data), state: DeviceTallyState.NONE };
                output.set(row.id, device);
            } catch {
                this.logger.error(`Failed to parse device with ID:`, row.id);
            }
        }

        return output;
    }

    // ? Settings Methods
    public getSetting<K extends SettingKey>(key: K): SettingType<K> | null {
        const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
        if (!row) return null;

        try {
            return JSON.parse(row.value) as SettingType<K>;
        } catch {
            this.logger.error(`Failed to parse setting:`, key);
            return null;
        }
    }

    public setSetting<K extends SettingKey>(key: K, value: SettingType<K>): void {
        const stmt = this.db.prepare(`
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
        `);
        stmt.run(key, JSON.stringify(value));
    }

    public static destroy(): void {
        // TODO Strengthen this with a try catch and make sure to handle errors properly.
        if (CoreDatabase.instance) {
            CoreDatabase.instance.logger.info(`Closing database.`);
            CoreDatabase.instance.db.close();
            CoreDatabase.instance = undefined as any;
        }
    }

}