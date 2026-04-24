import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'path';
import type { ProducerConfig, ProducerInfo } from '../tally/producer/AbstractTallyProducer';
import { ProducerStatus } from '../tally/producer/AbstractTallyProducer';
import { GlobalSourceDto, type SourceInfo } from '../tally/types/SourceTypes';
import type { ProducerBundle } from '../tally/types/ProducerTypes';
import { DeviceAddressDto, type DeviceAddress, type TallyDevice, type DeviceKey } from '../tally/types/DeviceTypes';
import { Logger } from '../logging/Logger';
import type { LifeCycleConsumerConfig } from '../tally/TallyLifecycle';
import { type OrchestratorConfig } from '../tally/TallyOrchestrator';
import type { ConsumerId } from '../tally/types/ConsumerTypes';
export const SettingKey = {
    consumers: {
        aedes: "consumers.aedes",
        gpio: "consumers.gpio",
    },
    orchestrator: "orchestrator",
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
        const dbPath = path.join(process.cwd(), '/db/beacon.db');
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
                config TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1
            );`);
        this.db.exec(`
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
    public saveProducer(entry: { type: string; enabled: boolean; config: ProducerConfig }): void {
        const stmt = this.db.prepare(`
            INSERT INTO producers (id, type, config, enabled)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET config=excluded.config, enabled=excluded.enabled
        `);
        stmt.run(entry.config.id, entry.type, JSON.stringify(entry.config), entry.enabled ? 1 : 0);
    }

    public getProducers(): Required<Omit<ProducerBundle, "info">>[] {
        const rows = this.db.prepare('SELECT * FROM producers').all() as { id: string, type: string, config: string, enabled: number }[];
        return rows.map(row => ({ type: row.type, enabled: row.enabled === 1, config: JSON.parse(row.config) }));
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
                    new GlobalSourceDto(s.source.producer, s.source.source).toKey(),
                    s
                ])
            );
            return { ...parsed, sources, status: parsed.status ?? ProducerStatus.OFFLINE };
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
        const id = DeviceAddressDto.from(device.id).toKey();
        const stmt = this.db.prepare(`
            INSERT INTO consumer_devices (id, consumer_id, data)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data=excluded.data
        `);
        stmt.run(id, device.id.consumer, JSON.stringify(device));
    }

    public getConsumerDevice(address: DeviceAddress): TallyDevice | null {
        const id = DeviceAddressDto.from(address).toKey();
        const row = this.db.prepare('SELECT data FROM consumer_devices WHERE id = ?').get(id) as { data: string } | undefined;
        if (!row) return null;

        try {
            return { ...JSON.parse(row.data) };
        } catch {
            this.logger.error(`Failed to parse device with ID:`, id);
            return null;
        }
    }

    public deleteConsumerDevice(address: DeviceAddress): void {
        const id = DeviceAddressDto.from(address).toKey();
        this.db.prepare('DELETE FROM consumer_devices WHERE id = ?').run(id);
    }

    public getConsumerDevices(consumerId: ConsumerId): Map<DeviceKey, TallyDevice> {
        const rows = this.db.prepare('SELECT id, data FROM consumer_devices WHERE consumer_id = ?').all(consumerId) as { id: DeviceKey, data: string }[];

        const output = new Map<DeviceKey, TallyDevice>();

        for (const row of rows) {
            try {
                const device: TallyDevice = { ...JSON.parse(row.data) };
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
        if (!CoreDatabase.instance) 
            return;
        
        try{
            CoreDatabase.instance.logger.info(`Closing database.`);
            const db = CoreDatabase.instance.db;
            if (db && db.open) {
                db.close(); 
            }
            CoreDatabase.instance.logger.info(`Database closed successfully.`);
        } catch (err) {
            CoreDatabase.instance.logger.error(`Error closing database:`, err);
        } finally {
            CoreDatabase.instance = undefined!;
        }
    
    }

}