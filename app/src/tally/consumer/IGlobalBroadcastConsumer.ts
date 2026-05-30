import type { AbstractConsumer } from "./AbstractConsumer";
import type { BusGroupStateMap } from "../types/SourceTypes";

export interface IGlobalBroadcastConsumer {
  publishTally(device: BusGroupStateMap): void; // TODO: Check if this should be a map with a state per source, computed by logic engine based on the default bus state/simpleBusNode?
}

export function isGlobalBroadcastConsumer(
  consumer: AbstractConsumer,
): consumer is AbstractConsumer & IGlobalBroadcastConsumer {
  return (
    "publishTally" in consumer &&
    typeof (consumer as AbstractConsumer & IGlobalBroadcastConsumer)
      .publishTally === "function"
  );
}
