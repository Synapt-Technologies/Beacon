import * as z from "zod";
import { AtemConfigProducerBundleSchema, AtemStoreProducerBundleSchema } from "./implementations/atem.schema";

export * from "./producers.base.schema";
export * from "./producers.types";

// ? Union exports (populated as implementations are added)

// API config request: type is known from route, use configBundleSchemaByType for exact validation
export const configBundleSchemaByType = {
  atem: AtemConfigProducerBundleSchema,
} as const;
export const ConfigProducerBundleSchema = z.union([AtemConfigProducerBundleSchema]);
export type ConfigProducerBundle = z.infer<typeof ConfigProducerBundleSchema>;

// DB storage: type is stored, discriminated union used for reads
export const StoreProducerBundleSchema = z.discriminatedUnion("type", [AtemStoreProducerBundleSchema]);
export type StoreProducerBundle = z.infer<typeof StoreProducerBundleSchema>;
