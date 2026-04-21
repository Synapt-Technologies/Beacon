import { CoreDatabase } from "./CoreDatabase";
import type { TallyDevice, DeviceAddress } from "../tally/types/DeviceTypes";
import { Logger } from "../logging/Logger";

export class ConsumerStore {

    private db = CoreDatabase.getInstance();
    private logger: Logger; // TODO Implement better logging in stores.

    constructor(private consumerId: string) {
        this.logger = new Logger(["Store", "CONS", consumerId]);
    }

    public saveDevice(device: TallyDevice): void {
        this.db.saveConsumerDevice(device);
    }

    public deleteDevice(address: DeviceAddress): void {
        this.db.deleteConsumerDevice(address);
    }

    public loadDevices(): Map<string, TallyDevice> {
        return this.db.getConsumerDevices(this.consumerId);
    }
}
