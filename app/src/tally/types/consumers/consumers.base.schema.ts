import * as z from "zod";
import { ConsumerIdSchema, portSchema } from "../common/common.schema";

export { ConsumerIdSchema };
export type ConsumerId = z.infer<typeof ConsumerIdSchema>;

// ? Config
export const BaseConsumerConfigSchema = z.object({
  id: ConsumerIdSchema,
  name: z.string().min(1).max(10),
});
export type BaseConsumerConfig = z.infer<typeof BaseConsumerConfigSchema>;

export const NetServerConsumerConfigSchema = BaseConsumerConfigSchema.extend({
  port: portSchema,
  keep_alive: z.boolean(),
  keep_alive_ms: z.number().int().positive(),
});
export type NetServerConsumerConfig = z.infer<typeof NetServerConsumerConfigSchema>;

// TODO: Add Hardware or Local Consumer Config Schemas.

// ? Bundles
const BaseBundleSchema = z.object({
  enabled: z.boolean().default(true),
  available: z.boolean().default(true),
  disableable: z.boolean().default(true),
});


// TODO: Check if there is a better way to keep in sync with the domain types.
export const createConfigConsumerBundleSchema = <TConfig extends z.ZodType<BaseConsumerConfig>>(
  config: TConfig,
) => BaseBundleSchema.extend({ config });

export const createInfoConsumerBundleSchema = <TType extends string, TShape extends z.ZodRawShape>(
  type: TType,
  configBundleSchema: z.ZodObject<TShape> & z.ZodType<{ enabled: boolean; config: BaseConsumerConfig }>,
) => configBundleSchema.extend({ type: z.literal(type) });