import type { AbstractConsumer } from "./AbstractConsumer";
import type { SourceStateBusGroupMap } from "../types/SourceTypes";

export interface IBroadcastConsumer {
  publishTally(state: SourceStateBusGroupMap): void;
}

export function isBroadcastConsumer(
  consumer: AbstractConsumer,
): consumer is AbstractConsumer & IBroadcastConsumer {
  return (
    "publishTally" in consumer &&
    typeof (consumer as AbstractConsumer & IBroadcastConsumer).publishTally ===
      "function"
  );
}
