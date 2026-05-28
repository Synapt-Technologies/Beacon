import { CoreDatabase } from "./CoreDatabase";
import type { ProducerInfo } from "../tally/producer/tallyProducer/AbstractTallyProducer";
import { Logger } from "../logging/Logger";

export class ProducerStore {

    private db = CoreDatabase.getInstance();
    private logger: Logger;

    constructor(private producerId: string) {
        this.logger = new Logger(["Store", "PROD", producerId]);
    }

    public saveInfo(info: ProducerInfo): void {
        this.logger.debug(`Saving info for producer ${this.producerId}.`);
        this.db.saveProducerInventory(this.producerId, info);
    }

    public loadInfo(): ProducerInfo | null {
        this.logger.debug(`Loading info for producer ${this.producerId}.`);
        return this.db.getProducerInventory(this.producerId);
    }
}
