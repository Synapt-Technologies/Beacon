import { TallyDevice } from "../../../src/tally/types/DeviceTypes";


export interface UITallyDevice extends TallyDevice {
    consumer: {
        name: string
    }
}