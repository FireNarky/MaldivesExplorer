import type { PermissionCode } from "@/lib/auth/permissions";

export function canWriteMedia(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("media.write");
}
