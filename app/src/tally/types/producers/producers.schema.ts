import * as z from "zod";
import { AtemConfigProducerBundleSchema, AtemStoreProducerBundleSchema } from "./implementations/atem.schema";

export * from "./producers.base.schema";

export const ConfigProducerBundleSchema = z.discriminatedUnion("type", [
  AtemConfigProducerBundleSchema,
]);
export type ConfigProducerBundle = z.infer<typeof ConfigProducerBundleSchema>; // TODO: Add validated to name?

export const StoreProducerBundleSchema = z.discriminatedUnion("type", [
  AtemStoreProducerBundleSchema,
]);
export type StoreProducerBundle = z.infer<typeof StoreProducerBundleSchema>; // TODO: Add validated to name?

