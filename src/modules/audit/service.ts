import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditEntry = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  correlationId?: string;
};

export async function writeAudit(
  entry: AuditEntry,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<string> {
  const row = await client.auditLog.create({
    data: {
      actorId: entry.actorId || null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
      correlationId: entry.correlationId ?? randomUUID(),
    },
    select: { id: true },
  });
  return row.id;
}
