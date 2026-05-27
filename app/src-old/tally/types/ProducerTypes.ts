import type { ProducerConfig, ProducerInfo } from "../producer/AbstractTallyProducer";

export type ProducerId = string;

export interface ProducerBundle {
    type: string,
    config: ProducerConfig,
    info: ProducerInfo
}
