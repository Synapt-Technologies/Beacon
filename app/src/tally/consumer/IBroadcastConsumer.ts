import type { AbstractConsumer } from "./AbstractConsumer";
import type { SourceStateBusGroupMap } from "../types/SourceTypes";

// TODO: Should this really be the bus map, or should it be possible to select a global bus? Or both?
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
