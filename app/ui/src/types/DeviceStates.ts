import { TallyDevice } from "../../../src/tally/types/ConsumerStates";


export interface UITallyDevice extends TallyDevice {
    consumer: {
        name: string
    }
}