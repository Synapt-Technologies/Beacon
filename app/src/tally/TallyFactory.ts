import type { AbstractConsumer } from "./consumer/AbstractConsumer";
import { RpiGpioHardwareConsumer } from "./consumer/hardwareConsumer/RpiGpioHardwareConsumer";
import { AedesNetServerConsumer } from "./consumer/networkConsumer/AedesNetworkConsumer";
import type { AbstractTallyProducer } from "./producer/tallyProducer/AbstractTallyProducer";
import { AtemNetClientTallyProducer } from "./producer/tallyProducer/networkProducer/AtemNetClientTallyProducer";
import type { ConsumerConfig } from "./types/ConsumerTypes";
import type { ProducerConfig } from "./types/ProducerTypes";


export class TallyFactory {

    public static createProducer(className: string, config: ProducerConfig): AbstractTallyProducer {
        switch (className) {
            case 'AtemNetClientTallyProducer':
                return new AtemNetClientTallyProducer(config);
            default:
                throw new Error(`Unknown producer type: ${className}`);
        }
    }

    public static createConsumer(className: string, config: ConsumerConfig): AbstractConsumer {
        switch (className) {
            case 'AedesNetServerConsumer':
                return new AedesNetServerConsumer(config);
            case 'RpiGpioHardwareConsumer':
                return new RpiGpioHardwareConsumer(config);
            default:
                throw new Error(`Unknown consumer type: ${className}`);
        }
    }

}
