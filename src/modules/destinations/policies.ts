import type { PermissionCode } from "@/lib/auth/permissions";

export function canEditDestinations(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("catalog.write");
}
