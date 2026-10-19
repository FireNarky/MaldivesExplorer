import { z } from "zod";

export const auditEntrySchema = z.object({
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
});
