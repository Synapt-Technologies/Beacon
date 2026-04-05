import Database from 'better-sqlite3';
import path from 'path';
import type { AbstractTallyProducer, ProducerConfig, ProducerInfo } from '../tally/producer/AbstractTallyProducer';
import { ConnectionType, DeviceTallyState, GlobalDeviceTools, type ConsumerId, type DeviceId, type TallyDevice } from '../tally/types/ConsumerStates';
import { Logger } from '../logging/Logger';
import type { AbstractConsumer } from '../tally/consumer/AbstractConsumer';

// TODO add more try catch.
export class CoreDatabase {
    private static instance: CoreDatabase;
    private db: Database.Database;

    private logger: Logger;

    private constructor() {
        const dbPath = path.join(process.cwd(), '/db/tally.db');
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
                name TEXT NOT NULL,
                connection TEXT NOT NULL,
                patch TEXT NOT NULL,
                data TEXT DEFAULT "{}",
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
        const stmt = this.db.prepare(`
            INSERT INTO producer_info (id, info)
            VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET info=excluded.info
        `);
        stmt.run(id, JSON.stringify(info));
    }

    public getProducerInventory(id: string): ProducerInfo | null {
        const row = this.db.prepare('SELECT info FROM producer_info WHERE id = ?').get(id) as { info: string } | undefined;
        if (!row) {
            return null;
        }

        return JSON.parse(row.info);
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

        const stmt = this.db.prepare(`
            INSERT INTO consumer_devices (id, consumer_id, name, connection, patch)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET consumer_id=excluded.consumer_id, name=excluded.name, connection=excluded.connection, patch=excluded.patch
        `);
        stmt.run(GlobalDeviceTools.create(device.id.consumer, device.id.device), device.id.consumer, JSON.stringify(device.name), device.connection, JSON.stringify(device.patch));
    }

    public getConsumerDevice(id: string): TallyDevice | null {
        const device = this.db.prepare('SELECT * FROM consumer_devices WHERE id = ?').get(id) as {id: string, consumer_id: ConsumerId, name: string, connection: ConnectionType, patch: string, data: string} | undefined;
        if (!device) {
            return null;
        }

        try {
            const parsedId = GlobalDeviceTools.parse(device.id);
            
            if (parsedId.consumer !== device.consumer_id) {
                this.logger.error(`ID mismatch when loading ConsumerDevice with ID:`, id, `from DB. Device:`, device);
                return null;
            }

            return {
                id: parsedId,
                name: JSON.parse(device.name),
                connection: device.connection,
                patch: JSON.parse(device.patch),
                state: DeviceTallyState.NONE
            };

        } catch (e) {
            this.logger.error(`Failed to parse device with ID`, device.id);
        }

        return null;
    }

    public getConsumerDevices(): Map<string, TallyDevice> | null {
        const rows = this.db.prepare('SELECT * FROM consumer_devices').all() as {id: string, consumer_id: ConsumerId, name: string, connection: ConnectionType, patch: string}[];

        const output: Map<string, TallyDevice> = new Map();

        for (const device of rows) {
            try {
                const parsedId = GlobalDeviceTools.parse(device.id);
                
                if (parsedId.consumer !== device.consumer_id) {
                    this.logger.error(`ID mismatch when batch loading ConsumerDevices. Device:`, device);
                    continue;
                }

                output.set(device.id, {
                    id: parsedId,
                    name: JSON.parse(device.name),
                    connection: device.connection,
                    patch: JSON.parse(device.patch),
                    state: DeviceTallyState.NONE
                });

            } catch (e) {
                this.logger.error(`Failed to parse device with ID`, device.id);
            }
        }

        return output;
    }

}