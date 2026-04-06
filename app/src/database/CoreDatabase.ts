import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'path';
import type { AbstractTallyProducer, ProducerConfig, ProducerInfo } from '../tally/producer/AbstractTallyProducer';
import { GlobalSourceTools, type SourceInfo } from '../tally/types/ProducerStates';
import { DeviceTallyState, GlobalDeviceTools, type DeviceAddress, type TallyDevice } from '../tally/types/ConsumerStates';
import { Logger } from '../logging/Logger';
import type { AbstractConsumer } from '../tally/consumer/AbstractConsumer';

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
            "CoreDatabase"
        ]);
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

            
            CREATE TABLE IF NOT EXISTS consumers (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                config TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS consumer_devices (
                id TEXT PRIMARY KEY,
                consumer_id TEXT NOT NULL,
                data TEXT NOT NULL,
                FOREIGN KEY(consumer_id) REFERENCES consumers(id) ON DELETE CASCADE
            );
            
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

    public getProducers(): {id: string, type: string, config: ProducerConfig}[] {
        return this.db.prepare('SELECT * FROM producers').all() as {id: string, type: string, config: ProducerConfig}[]; // TODO Json parsing
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

    // ? Consumer Methods
    public saveConsumer(consumer: AbstractConsumer): void {
        const stmt = this.db.prepare(`
            INSERT INTO consumers (id, type, config)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET config=excluded.config
        `);
        stmt.run(consumer.getId(), consumer.constructor.name, JSON.stringify(consumer.getConfig()));
    }
    public getConsumers(): {id: string, type: string, config: ProducerConfig}[] {
        return this.db.prepare('SELECT * FROM consumers').all() as {id: string, type: string, config: ProducerConfig}[]; // TODO Json parsing
    }

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

}