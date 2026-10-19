import { db } from "@/lib/db";
import {
  isRoleCode,
  permissionsForRole,
  type PermissionCode,
  type RoleCode,
} from "@/lib/auth/permissions";
import { writeAudit } from "@/modules/audit/service";

export async function permissionsForUser(userId: string): Promise<PermissionCode[]> {
  const rows = await db.userRole.findMany({
    where: { userId },
    select: { role: { select: { code: true } } },
  });
  const granted = new Set<PermissionCode>();
  for (const row of rows) {
    if (!isRoleCode(row.role.code)) continue;
    for (const permission of permissionsForRole(row.role.code)) granted.add(permission);
  }
  return [...granted];
}

export async function userHasPermission(
  userId: string,
  permission: PermissionCode,
): Promise<boolean> {
  const permissions = await permissionsForUser(userId);
  return permissions.includes(permission);
}

export async function isStaffUser(userId: string): Promise<boolean> {
  const count = await db.userRole.count({ where: { userId } });
  return count > 0;
}

export async function assignRole(input: {
  actorId: string;
  userId: string;
  role: RoleCode;
  correlationId?: string;
}): Promise<void> {
  const actorPermissions = await permissionsForUser(input.actorId);
  if (!actorPermissions.includes("user.manage")) {
    throw new Error("This account cannot assign roles.");
  }

  await db.$transaction(async (tx) => {
    const role = await tx.role.findUnique({ where: { code: input.role }, select: { id: true } });
    if (!role) throw new Error("That role is not seeded.");
    const existing = await tx.userRole.findUnique({
      where: { userId_roleId: { userId: input.userId, roleId: role.id } },
    });
    if (!existing) {
      await tx.userRole.create({
        data: { userId: input.userId, roleId: role.id, assignedById: input.actorId },
      });
    }
    await tx.session.updateMany({
      where: { userId: input.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAudit(
      {
        actorId: input.actorId,
        action: "user.role.assign",
        entityType: "user",
        entityId: input.userId,
        after: { role: input.role },
        correlationId: input.correlationId,
      },
      tx,
    );
  });
}
