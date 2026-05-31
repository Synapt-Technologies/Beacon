import type { AbstractConsumer } from "./AbstractConsumer";
import type { SourceStateMap } from "../types/SourceTypes";

export interface IBroadcastConsumer {
  publishTally(state: SourceStateMap): void;
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
