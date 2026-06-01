import * as z from "zod";
import { ConnectionState, TallyState } from "./common.domain";

export const portSchema = z.number().int().min(0).max(65535);

export const baseIdSchema = z.string().min(1).regex(/^[^:]+$/, "ID cannot contain ':'");
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

export const ConnectionStateSchema = z.enum(ConnectionState);
export const TallyStateSchema = z.enum(TallyState);
