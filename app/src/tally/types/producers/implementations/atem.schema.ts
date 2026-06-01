import * as z from "zod";
import {
  NetClientProducerConfigSchema,
  createConfigProducerBundleSchema,
  createInfoProducerBundleSchema,
} from "../producers.base.schema";
import type { InfoProducerBundle } from "../producers.domain";

export const AtemProducerConfigSchema = NetClientProducerConfigSchema.extend({
  port: NetClientProducerConfigSchema.shape.port.default(9910),
});
export type AtemProducerConfig = z.infer<typeof AtemProducerConfigSchema>;

export const AtemConfigProducerBundleSchema = createConfigProducerBundleSchema(AtemProducerConfigSchema);
export type AtemConfigProducerBundle = z.infer<typeof AtemConfigProducerBundleSchema>;

export const AtemStoreProducerBundleSchema = createInfoProducerBundleSchema("atem", AtemConfigProducerBundleSchema);
export type AtemStoreProducerBundle = z.infer<typeof AtemStoreProducerBundleSchema>;

export type AtemInfoProducerBundle = InfoProducerBundle<"atem", AtemProducerConfig>;
