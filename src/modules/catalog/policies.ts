import type { PermissionCode } from "@/lib/auth/permissions";

export function canEditCatalog(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("catalog.write");
}

export function canPublishResort(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("catalog.publish");
}
