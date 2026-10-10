import { z } from "zod";

export const mediaUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(120),
});
