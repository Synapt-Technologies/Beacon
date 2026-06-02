import * as z from "zod";
import { baseIdSchema, portSchema } from "../common/common.schema";

export const ProducerIdSchema = baseIdSchema.brand("ProducerId");
export type ProducerId = z.infer<typeof ProducerIdSchema>;

// ? Base configs
export const BaseProducerConfigSchema = z.object({
  id: ProducerIdSchema,
  name: z.string().min(1).max(10),
});
export type BaseProducerConfig = z.infer<typeof BaseProducerConfigSchema>;

export const NetClientProducerConfigSchema = BaseProducerConfigSchema.extend({
  host: z.ipv4(),
  port: portSchema,
});
export type NetClientProducerConfig = z.infer<typeof NetClientProducerConfigSchema>;

// ? Bundle factory functions
export const createConfigBundleSchema = <TConfig extends z.ZodType<BaseProducerConfig>>(
  config: TConfig,
) => z.object({ enabled: z.boolean().default(true), config });

export const createStoreBundleSchema = <TType extends string, TConfig extends z.ZodType<BaseProducerConfig>>(
  type: TType,
  config: TConfig,
) => z.object({ type: z.literal(type), enabled: z.boolean().default(true), config });
