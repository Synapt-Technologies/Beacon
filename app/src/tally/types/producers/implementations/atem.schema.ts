import * as z from "zod";
import {
  NetClientProducerConfigSchema,
  createConfigBundleSchema,
  createProducerBundleSchema,
} from "../producers.base.schema";
import type { InfoProducerBundle } from "../producers.domain";

export const AtemProducerConfigSchema = NetClientProducerConfigSchema.extend({
  port: NetClientProducerConfigSchema.shape.port.default(9910),
});
export type AtemProducerConfig = z.infer<typeof AtemProducerConfigSchema>;

export const AtemConfigBundleSchema = createConfigBundleSchema(AtemProducerConfigSchema);
export type AtemConfigProducerBundle = z.infer<typeof AtemConfigBundleSchema>;

export const AtemProducerBundleSchema = createProducerBundleSchema("atem", AtemConfigBundleSchema);
export type AtemStoreProducerBundle = z.infer<typeof AtemProducerBundleSchema>;

export type AtemInfoProducerBundle = InfoProducerBundle<"atem", AtemProducerConfig>;
