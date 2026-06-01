import * as z from "zod";
import { baseIdSchema, portSchema } from "../common/common.schema";
import type { ConnectionState } from "../common/common.domain";

export const ConsumerIdSchema = baseIdSchema.brand("ConsumerId");
export type ConsumerId = z.infer<typeof ConsumerIdSchema>;


// ? Config
// TODO: Add some sort of Platform details? To publish on keepalive and set firmware version on RpiGpio devices etc.
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

const BaseBundleSchema = z.object({
  enabled: z.boolean().default(true),
  available: z.boolean().default(true),
  disableable: z.boolean().default(true),
});

export interface ConsumerBundle {
  type: string;
  enabled: boolean;
  available: boolean;
  disableable: boolean;
  config: BaseConsumerConfig;
  info: ConsumerInfo;
}
