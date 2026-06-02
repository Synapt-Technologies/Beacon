import * as z from "zod";
import { NetClientProducerConfigSchema, createConfigBundleSchema, createStoreBundleSchema } from "../producers.base.schema";
import type { InfoProducerBundle } from "../producers.types";

/**
 * ATEM switcher config. Extends {@link NetClientProducerConfig} with a default port of 9910.
 * @see NetClientProducerConfig
 */
export const AtemProducerConfigSchema = NetClientProducerConfigSchema.extend({
  port: NetClientProducerConfigSchema.shape.port.default(9910),
});
export type AtemProducerConfig = z.infer<typeof AtemProducerConfigSchema>;

/**
 * API config request bundle for an ATEM producer. Type is inferred from the route.
 * @see AtemProducerConfig
 * @see createConfigBundleSchema
 */
export const AtemConfigProducerBundleSchema = createConfigBundleSchema(AtemProducerConfigSchema);
export type AtemConfigProducerBundle = z.infer<typeof AtemConfigProducerBundleSchema>;

/**
 * DB storage bundle for an ATEM producer. Includes `type: "atem"` as discriminator.
 * @see AtemProducerConfig
 * @see createStoreBundleSchema
 */
export const AtemStoreProducerBundleSchema = createStoreBundleSchema("atem", AtemProducerConfigSchema);
export type AtemStoreProducerBundle = z.infer<typeof AtemStoreProducerBundleSchema>;

/**
 * Full runtime bundle for an ATEM producer, including live connection info.
 * @see AtemStoreProducerBundle
 * @see ProducerInfo
 */
export type AtemInfoProducerBundle = InfoProducerBundle<"atem", AtemProducerConfig>;
