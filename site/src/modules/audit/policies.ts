import type { PermissionCode } from "@/lib/auth/permissions";

export function canReadAudit(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("audit.read");
}
