import type { Prisma } from "@prisma/client";

export async function deliverEmail(payload: Prisma.JsonValue): Promise<void> {
  void payload;
  throw new Error("Email delivery is not configured.");
}
