import * as z from "zod";
import { ProducerIdSchema, portSchema } from "../zod.common/common.schema";

export { ProducerIdSchema };

/** Minimum config shared by all producer types. */
export const BaseProducerConfigSchema = z.object({
  id: ProducerIdSchema,
  name: z.string().min(1).max(10),
});
export type BaseProducerConfig = z.infer<typeof BaseProducerConfigSchema>;

/**
 * Config for producers that connect as a TCP/UDP client.
 * @see BaseProducerConfig
 */
export const NetClientProducerConfigSchema = BaseProducerConfigSchema.extend({
  host: z.ipv4(),
  port: portSchema,
});
export type NetClientProducerConfig = z.infer<typeof NetClientProducerConfigSchema>;

/**
 * Wraps a producer config in a bundle used for API config requests.
 * Produces `{ enabled, config }`.
 * @see createStoreBundleSchema
 */
export const createConfigBundleSchema = <TConfig extends z.ZodType<BaseProducerConfig>>(
  config: TConfig,
) => z.object({ enabled: z.boolean().default(true), config });

/**
 * Wraps a producer config in a bundle used for DB storage.
 * Produces `{ type, enabled, config }`.
 * @see createConfigBundleSchema
 */
export const createStoreBundleSchema = <TType extends string, TConfig extends z.ZodType<BaseProducerConfig>>(
  type: TType,
  config: TConfig,
) => z.object({ type: z.literal(type), enabled: z.boolean().default(true), config });
