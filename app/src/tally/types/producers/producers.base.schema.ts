import * as z from "zod";
import { ProducerIdSchema, portSchema } from "../common/common.schema";
import type { BaseProducerConfig, NetClientProducerConfig } from "./producers.types";

export { ProducerIdSchema };

// ? Base configs
export const BaseProducerConfigSchema = z.object({
  id: ProducerIdSchema,
  name: z.string().min(1).max(10),
}) satisfies z.ZodType<BaseProducerConfig>;

export const NetClientProducerConfigSchema = BaseProducerConfigSchema.extend({
  host: z.ipv4(),
  port: portSchema,
}) satisfies z.ZodType<NetClientProducerConfig>;

// ? Bundle factory functions
export const createConfigBundleSchema = <TConfig extends z.ZodType<BaseProducerConfig>>(
  config: TConfig,
) => z.object({ enabled: z.boolean().default(true), config });

export const createStoreBundleSchema = <TType extends string, TConfig extends z.ZodType<BaseProducerConfig>>(
  type: TType,
  config: TConfig,
) => z.object({ type: z.literal(type), enabled: z.boolean().default(true), config });
