import { CoreDatabase } from "./CoreDatabase";

export class ProducerPersistenceAgent {
    constructor(private producerId: string) {}

    public async loadMemory(): Promise<{model: string, sources: Map<string, any>} | null> {
        const row = CoreDatabase.getInstance().getProducerInventory(this.producerId);
        if (!row) return null;

        return {
            model: row.model,
            sources: new Map(JSON.parse(row.sources))
        };
    }

    public saveMemory(model: string, sources: Map<string, any>) {
        CoreDatabase.getInstance().saveProducerInventory(this.producerId, model, sources);
    }
}