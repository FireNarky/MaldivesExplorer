import type { PermissionCode } from "@/lib/auth/permissions";

export const moduleStatus = "implemented" as const;

export function seesAllEnquiries(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("enquiry.read.all");
}

export function canReadEnquiry(
  permissions: readonly PermissionCode[],
  userId: string,
  assignedUserId: string | null,
): boolean {
  if (!userId) return false;
  if (permissions.includes("enquiry.read.all")) return true;
  return permissions.includes("enquiry.read.assigned") && assignedUserId === userId;
}

export function canUpdateEnquiry(
  permissions: readonly PermissionCode[],
  userId: string,
  assignedUserId: string | null,
): boolean {
  return (
    permissions.includes("enquiry.update") && canReadEnquiry(permissions, userId, assignedUserId)
  );
}

export function canAssignEnquiries(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("enquiry.assign");
}

export function canExportEnquiries(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("enquiry.export");
}

export function canReadOperationsReport(permissions: readonly PermissionCode[]): boolean {
  return (
    permissions.includes("report.read") &&
    (permissions.includes("enquiry.read.all") || permissions.includes("enquiry.read.assigned"))
  );
}

export function canAttachEnquiryMedia(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("media.read") && permissions.includes("enquiry.update");
}
