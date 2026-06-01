import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

import fs from 'node:fs';
import path from 'path';

import { Logger } from '../logging/Logger';


import type { LifeCycleConsumerConfig } from '../tally/TallyLifecycle';
import type { OrchestratorConfig } from '../tally/TallyOrchestrator';
import { DeviceTools, TallyDeviceDto, type DeviceAddress, type DeviceKey, type StoredTallyDevice, type TallyDeviceMap } from '../tally/types/DeviceTypes';
import type { ProducerInfo, StoreProducerBundle } from '../tally/types/ProducerTypes';
import { SourceTools, type SourceInfo } from '../tally/types/SourceTypes';
import { ConnectionState } from '../tally/types/CommonTypes';

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
// TODO: Add type validation like with Zod.
export class CoreDatabase {
    private static _instance: CoreDatabase | undefined;
    private _db: BetterSQLite3Database<typeof schema>;

    private _logger: Logger;

    private constructor() {
        this._logger = new Logger([
            "DB"
        ]);

        const dbPath = path.join(process.cwd(), '/db/beacon.db');
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        const sqlite = new Database(dbPath);
        // TODO: Check if WAL is needed. File cleanup/closure doesn't always complete on shutdown.
        sqlite.pragma('journal_mode = WAL'); // High-performance mode

        this._db = drizzle(sqlite, { schema });

        this._migrateData();
        this._logger.info(`Database initialized at:`, dbPath);
    }
    
    public static getInstance(): CoreDatabase {
        if (!CoreDatabase._instance) {
            CoreDatabase._instance = new CoreDatabase();
        }
        return CoreDatabase._instance;
    }

    // TODO: Check beacon/db version and auto migrate between them.
    private _migrateData() { /* empty */ }


    // ? Producer Methods
    public saveProducer(entry: StoreProducerBundle): void {
        this._db.insert(entry).values({ id, type, config, enabled })
            .onConflictDoUpdate({ target: producers.id, set: { config, enabled } })
            .run();
    }

    // public getProducers(): Required<Omit<ProducerBundle, "info">>[] { // TODO: Removed Omit. Check if desired.
    // TODO: Info contains state. Should be excluded?
    // TODO: Try and catch?
    public getProducers(): StoreProducerBundle[] {
        const rows = this.db.prepare('SELECT * FROM producers').all() as { _id: string, type: string, enabled: number , config: string }[];
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
                    SourceTools.fromAddress(s.id),
                    s
                ])
            );
            return { ...parsed, sources, status: parsed.state ?? ConnectionState.OFFLINE };
        } catch {
            this.logger.error(`Failed to parse producer inventory for:`, id);
            return null;
        }
    }

    public deleteProducer(id: string): void {
        this.db.prepare('DELETE FROM producers WHERE id = ?').run(id);
    }

    // ? Consumer Device Methods
    public saveConsumerDevices(devices: StoredTallyDevice[]) {
        devices.forEach(device => this.saveConsumerDevice(device));
    }

    public saveConsumerDevice(device: StoredTallyDevice) {
        const dto = new TallyDeviceDto(device);
        const stmt = this.db.prepare(`
            INSERT INTO consumer_devices (id, consumer_id, data)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data=excluded.data
        `);
        stmt.run(dto.toKey(), dto.id.consumer, JSON.stringify(dto.toStored()));
    }

    public getConsumerDevice(address: DeviceAddress): StoredTallyDevice | null {
        const id = DeviceTools.toKey(address);
        const row = this.db.prepare('SELECT data FROM consumer_devices WHERE id = ?').get(id) as { data: string } | undefined;
        if (!row) return null;

        try {
            return new TallyDeviceDto(JSON.parse(row.data)).toStored();
        } catch {
            this.logger.error(`Failed to parse device with ID:`, id);
            return null;
        }
    }

    public deleteConsumerDevice(address: DeviceAddress): void {
        const id = DeviceTools.toKey(address);
        this.db.prepare('DELETE FROM consumer_devices WHERE id = ?').run(id);
    }

    public getConsumerDevices(consumerId: string): TallyDeviceMap {
        const rows = this.db.prepare('SELECT id, data FROM consumer_devices WHERE consumer_id = ?').all(consumerId) as { id: DeviceKey, data: string }[];

        const output = new Map<DeviceKey, StoredTallyDevice>();

        for (const row of rows) {
            try {
                const parsed = JSON.parse(row.data);
                const device: StoredTallyDevice = new TallyDeviceDto(parsed).toStored();
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
            CoreDatabase.instance?.logger.error(`Error closing database:`, err);
        } finally {
            CoreDatabase.instance = undefined;
        }
    
    }

}