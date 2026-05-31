import type { AbstractConsumer } from "./consumer/AbstractConsumer";
import { RpiGpioHardwareConsumer } from "./consumer/hardwareConsumer/RpiGpioHardwareConsumer";
import { AedesNetServerConsumer } from "./consumer/networkConsumer/AedesNetworkConsumer";
import type { AbstractTallyProducer } from "./producer/tallyProducer/AbstractTallyProducer";
import { AtemNetClientTallyProducer } from "./producer/tallyProducer/networkProducer/AtemNetClientTallyProducer";

const consumerRegistry = {
    AedesNetServerConsumer,
    RpiGpioHardwareConsumer,
} as const;

const producerRegistry = {
    AtemNetClientTallyProducer,
} as const;

type ConsumerConfigMap = {
    [K in keyof typeof consumerRegistry]: ConstructorParameters<(typeof consumerRegistry)[K]>[0];
};

type ProducerConfigMap = {
    [K in keyof typeof producerRegistry]: ConstructorParameters<(typeof producerRegistry)[K]>[0];
};

export class TallyFactory {

    public static isConsumerClass(className: string): className is keyof ConsumerConfigMap {
        return className in consumerRegistry;
    }

    public static isProducerClass(className: string): className is keyof ProducerConfigMap {
        return className in producerRegistry;
    }

    public static createConsumer<K extends keyof ConsumerConfigMap>(
        className: K,
        config: ConsumerConfigMap[K],
    ): AbstractConsumer {
        return new (consumerRegistry[className] as new (c: ConsumerConfigMap[K]) => AbstractConsumer)(config);
    }

    // TODO: Add type validation like Zod and remove this.
    public static createConsumerFromString(
        className: string,
        config: Record<string, unknown>,
    ): AbstractConsumer {
        if (!this.isConsumerClass(className)) {
            throw new Error(`Factory Error: "${className}" is not a registered Consumer.`);
        }
        return this.createConsumer(className, config as never);
    }

    public static createProducer<K extends keyof ProducerConfigMap>(
        className: K,
        config: ProducerConfigMap[K],
    ): AbstractTallyProducer {
        return new (producerRegistry[className] as new (c: ProducerConfigMap[K]) => AbstractTallyProducer)(config);
    }

    // TODO: Add type validation like Zod and remove this.
    public static createProducerFromString(
        className: string,
        config: Record<string, unknown>,
    ): AbstractTallyProducer {
        if (!this.isProducerClass(className)) {
            throw new Error(`Factory Error: "${className}" is not a registered Producer.`);
        }
        return this.createProducer(className, config as never);
    }
}
