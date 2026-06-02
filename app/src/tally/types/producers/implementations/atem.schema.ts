import * as z from "zod";
import { NetClientProducerConfigSchema, createConfigBundleSchema, createStoreBundleSchema } from "../producers.base.schema";
import type { NetClientProducerConfig, ConfigProducerBundle, StoreProducerBundle, InfoProducerBundle } from "../producers.types";

export interface AtemProducerConfig extends NetClientProducerConfig {}

export const AtemProducerConfigSchema = NetClientProducerConfigSchema.extend({
  port: NetClientProducerConfigSchema.shape.port.default(9910),
}) satisfies z.ZodType<AtemProducerConfig>;

export const AtemConfigProducerBundleSchema = (
  createConfigBundleSchema(AtemProducerConfigSchema)
) satisfies z.ZodType<ConfigProducerBundle<AtemProducerConfig>>;

export const AtemStoreProducerBundleSchema = (
  createStoreBundleSchema("atem", AtemProducerConfigSchema)
) satisfies z.ZodType<StoreProducerBundle<"atem", AtemProducerConfig>>;

export type AtemInfoProducerBundle = InfoProducerBundle<"atem", AtemProducerConfig>;
