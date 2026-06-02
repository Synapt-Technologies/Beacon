import * as z from "zod";
import { NetClientProducerConfigSchema, createConfigBundleSchema, createStoreBundleSchema } from "../producers.base.schema";
import type { InfoProducerBundle } from "../producers.types";

export const AtemProducerConfigSchema = NetClientProducerConfigSchema.extend({
  port: NetClientProducerConfigSchema.shape.port.default(9910),
});
export type AtemProducerConfig = z.infer<typeof AtemProducerConfigSchema>;

export const AtemConfigProducerBundleSchema = createConfigBundleSchema(AtemProducerConfigSchema);
export type AtemConfigProducerBundle = z.infer<typeof AtemConfigProducerBundleSchema>;

export const AtemStoreProducerBundleSchema = createStoreBundleSchema("atem", AtemProducerConfigSchema);
export type AtemStoreProducerBundle = z.infer<typeof AtemStoreProducerBundleSchema>;

export type AtemInfoProducerBundle = InfoProducerBundle<"atem", AtemProducerConfig>;
