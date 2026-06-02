import * as z from "zod";
import { ConnectionState, TallyState } from "./common.domain";

export const portSchema = z.number().int().min(0).max(65535);

/** Base for all branded ID types. Validates non-empty string with no colons. */
export const baseIdSchema = z.string().min(1).regex(/^[^:]+$/, "ID cannot contain ':'").brand("ID");
export type BaseId = z.infer<typeof baseIdSchema>;

/** @see BaseId */
export const ProducerIdSchema = baseIdSchema.brand("Producer");
export type ProducerId = z.infer<typeof ProducerIdSchema>;

/** @see BaseId */
export const ConsumerIdSchema = baseIdSchema.brand("Consumer");
export type ConsumerId = z.infer<typeof ConsumerIdSchema>;

/** Normalising transform on top of {@link baseIdSchema}: trims, lowercases, and percent-encodes spaces and colons. */
export const idSchema = baseIdSchema
  .trim()
  .normalize()
  .toLowerCase()
  .transform(val => val
    .replace(/\s+/g, '%20')
    .replace(/:/g, '%3A')
  );

export const DisplayNameSchema = z.object({
  long: z.string().min(1).max(20),
  short: z.string().min(1).max(8).optional(),
});
export type DisplayName = z.infer<typeof DisplayNameSchema>;

export const ConnectionStateSchema = z.enum(ConnectionState);
export const TallyStateSchema = z.enum(TallyState);
