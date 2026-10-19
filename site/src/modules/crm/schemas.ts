import { z } from "zod";

export const moduleStatus = "implemented" as const;

export const statusPatchSchema = z
  .object({
    status: z.string(),
    revision: z.number().int().positive(),
    reasonCode: z.string().max(40).optional(),
    wonReference: z.string().max(80).optional(),
    followUp: z.string().max(40).optional(),
    checklist: z.boolean().optional(),
    channel: z.string().max(20).optional(),
  })
  .strict();

export const assignSchema = z
  .object({
    userId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(500),
    revision: z.number().int().positive(),
  })
  .strict();

export type StatusPatch = z.infer<typeof statusPatchSchema>;
export type AssignInput = z.infer<typeof assignSchema>;
