import type { PermissionCode } from "@/lib/auth/permissions";

export function canManageUsers(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("user.manage");
}
