import { CoreDatabase } from "./CoreDatabase";
import { Logger } from "../logging/Logger";
import type { DeviceAddress, StoredTallyDevice, TallyDeviceMap } from "../tally/types/DeviceTypes";

export class ConsumerStore {

    private db = CoreDatabase.getInstance();
    private logger: Logger;

    constructor(private consumerId: string) {
        this.logger = new Logger(["Store", "CONS", consumerId]);
    }

    public saveDevice(device: StoredTallyDevice): void {
        this.db.saveConsumerDevice(device);
    }

    public deleteDevice(address: DeviceAddress): void {
        this.db.deleteConsumerDevice(address);
    }

    public loadDevices(): TallyDeviceMap {
        return this.db.getConsumerDevices(this.consumerId);
    }
}
