import * as z from "zod";
import { AtemConfigProducerBundleSchema, AtemStoreProducerBundleSchema } from "./implementations/atem.schema";

export * from "./producers.base.schema";

/**
 * Maps each producer type key to its config bundle schema.
 * Use this for precise per-type validation when the type is known from the route.
 * @see ConfigProducerBundleSchema
 */
export const configBundleSchemaByType = {
  atem: AtemConfigProducerBundleSchema,
} as const;

/**
 * Union of all producer config bundle schemas.
 * Used for API config requests where type comes from the route, not the body.
 * For per-type validation use {@link configBundleSchemaByType}.
 */
export const ConfigProducerBundleSchema = z.union([AtemConfigProducerBundleSchema]);
export type ConfigProducerBundle = z.infer<typeof ConfigProducerBundleSchema>;

/**
 * Discriminated union of all producer store bundle schemas (discriminated on `type`).
 * Used for DB reads and writes.
 */
export const StoreProducerBundleSchema = z.discriminatedUnion("type", [AtemStoreProducerBundleSchema]);
export type StoreProducerBundle = z.infer<typeof StoreProducerBundleSchema>;
