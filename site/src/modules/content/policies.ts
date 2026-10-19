import type { PermissionCode } from "@/lib/auth/permissions";

export function canEditContent(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("content.write");
}

export function canPublishContent(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("content.publish");
}
