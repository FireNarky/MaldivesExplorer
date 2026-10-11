import type { PermissionCode } from "@/lib/auth/permissions";
import type { PublishStatus } from "@prisma/client";
import { transitionNeedsPublishPermission } from "@/modules/publishing/workflow";

export function canWriteCatalog(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("catalog.write");
}

export function canPublishCatalog(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("catalog.publish");
}

export function canWriteContent(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("content.write");
}

export function canPublishContent(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("content.publish");
}

export function canTransitionWith(
  permissions: readonly PermissionCode[],
  status: PublishStatus,
  domain: "catalog" | "content" | "media",
): boolean {
  if (domain === "media") {
    return transitionNeedsPublishPermission(status)
      ? permissions.includes("media.write")
      : permissions.includes("media.write");
  }
  const write = domain === "catalog" ? "catalog.write" : "content.write";
  const publish = domain === "catalog" ? "catalog.publish" : "content.publish";
  return permissions.includes(transitionNeedsPublishPermission(status) ? publish : write);
}
