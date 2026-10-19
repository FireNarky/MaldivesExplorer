import type { PermissionCode } from "@/lib/auth/permissions";

export function canEditExperiences(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("catalog.write");
}
