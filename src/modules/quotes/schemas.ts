import { z } from "zod";

export const moduleStatus = "implemented" as const;

export const createQuoteSchema = z
  .object({
    reference: z.string().regex(/^ME-E-[0-9]{6}$/),
  })
  .strict();

export const quoteResponseSchema = z
  .object({
    responseType: z.enum(["CLARIFICATION", "ACCEPT", "DECLINE"]),
    message: z.string().max(2000).optional(),
  })
  .strict();
