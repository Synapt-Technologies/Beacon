import { CoreDatabase } from "./CoreDatabase";
import type { TallyDevice, DeviceAddress, DeviceKey } from "../tally/types/DeviceTypes";
import { Logger } from "../logging/Logger";

export class ConsumerStore {

    private db = CoreDatabase.getInstance();
    private logger: Logger; // TODO Implement better logging in stores.

    constructor(private consumerId: string) {
        this.logger = new Logger(["Store", "CONS", consumerId]);
    }

    public saveDevice(device: TallyDevice): void {
        try {
            this.db.saveConsumerDevice(device);
        } catch (error) {
            this.logger.error(`Failed to save device ${device.id} to store:`, error);
        }
    }

    public deleteDevice(address: DeviceAddress): void {
        try {
            this.db.deleteConsumerDevice(address);
        } catch (error) {
            this.logger.error(`Failed to delete device ${address} from store:`, error);
        }
    }

    public loadDevices(): Map<DeviceKey, TallyDevice> {
        try {
            return this.db.getConsumerDevices(this.consumerId);
        } catch (error) {
            this.logger.error(`Failed to load devices for consumer ${this.consumerId}:`, error);
            return new Map();
        }
    }
}
