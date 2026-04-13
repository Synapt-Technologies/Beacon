import { AtemNetClientTallyProducer } from "./producer/networkProducer/AtemNetClientTallyProducer";
import { AedesNetworkConsumer } from "./consumer/networkConsumer/AedesNetworkConsumer";
import { RpiGpioHardwareConsumer } from "./consumer/hardwareConsumer/RpiGpioHardwareConsumer";
import type { AbstractTallyProducer, ProducerConfig } from "./producer/AbstractTallyProducer";
import type { AbstractConsumer, ConsumerConfig } from "./consumer/AbstractConsumer";

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
            case 'AedesNetworkConsumer':
                return new AedesNetworkConsumer(config);
            case 'RpiGpioHardwareConsumer':
                return new RpiGpioHardwareConsumer(config);
            default:
                throw new Error(`Unknown consumer type: ${className}`);
        }
    }

}
