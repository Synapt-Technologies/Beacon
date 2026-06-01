import * as z from "zod";
import { AtemProducerBundleSchema } from "./implementations/atem.schema";

export * from "./producers.base.schema";

export const StoreProducerBundleSchema = z.discriminatedUnion("type", [
  AtemProducerBundleSchema,
]);
export type ValidatedStoreBundle = z.infer<typeof StoreProducerBundleSchema>;
