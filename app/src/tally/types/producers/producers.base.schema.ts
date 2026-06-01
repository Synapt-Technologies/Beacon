import * as z from "zod";
import { baseIdSchema, portSchema } from "../common/common.schema";

export const ProducerIdSchema = baseIdSchema.brand("ProducerId");
export type ProducerId = z.infer<typeof ProducerIdSchema>;

// ? Config
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

// TODO: Add Hardware or Local Producer Config Schemas.

// ? Bundles
const BaseBundleSchema = z.object({
  enabled: z.boolean().default(true),
});

// TODO: Check if there is a better way to keep in sync with the domain types.
export const createConfigBundleSchema = <TConfig extends z.ZodType<BaseProducerConfig>>(
  config: TConfig,
) => BaseBundleSchema.extend({ config });

export const createProducerBundleSchema = <TType extends string, TShape extends z.ZodRawShape>(
  type: TType,
  configBundleSchema: z.ZodObject<TShape> & z.ZodType<{ enabled: boolean; config: BaseProducerConfig }>,
) => configBundleSchema.extend({ type: z.literal(type) });
