import type { AbstractConsumer } from "./AbstractConsumer";
import type { TallyDevice } from "../types/ConsumerStates";

export interface IGlobalBroadcastConsumer {
  publishDeviceTally(device: TallyDevice): void;
}

export function isGlobalBroadcastConsumer(
  consumer: AbstractConsumer,
): consumer is AbstractConsumer & IGlobalBroadcastConsumer {
  return (
    "publishDeviceTally" in consumer &&
    typeof (consumer as AbstractConsumer & IGlobalBroadcastConsumer)
      .publishDeviceTally === "function"
  );
}
