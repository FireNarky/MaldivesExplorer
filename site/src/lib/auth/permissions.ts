export const roleCodes = [
  "CONSULTANT",
  "CONTENT_EDITOR",
  "CONTENT_APPROVER",
  "OPERATIONS_MANAGER",
  "ADMINISTRATOR",
  "AUDITOR",
] as const;

export type RoleCode = (typeof roleCodes)[number];

export const permissionCodes = [
  "catalog.read",
  "catalog.write",
  "catalog.publish",
  "content.read",
  "content.write",
  "content.publish",
  "media.read",
  "media.write",
  "enquiry.read.assigned",
  "enquiry.read.all",
  "enquiry.update",
  "enquiry.assign",
  "enquiry.export",
  "quote.read",
  "quote.write",
  "quote.approve",
  "quote.send",
  "customer.read",
  "customer.export",
  "review.moderate",
  "review.publish",
  "newsletter.read",
  "newsletter.write",
  "report.read",
  "user.manage",
  "setting.manage",
  "audit.read",
  "privacy.manage",
] as const;

export type PermissionCode = (typeof permissionCodes)[number];

const all = new Set<PermissionCode>(permissionCodes);

const matrix: Record<RoleCode, readonly PermissionCode[]> = {
  CONSULTANT: [
    "catalog.read",
    "content.read",
    "media.read",
    "enquiry.read.assigned",
    "enquiry.update",
    "quote.read",
    "quote.write",
    "quote.send",
    "customer.read",
  ],
  CONTENT_EDITOR: [
    "catalog.read",
    "catalog.write",
    "content.read",
    "content.write",
    "media.read",
    "media.write",
    "review.moderate",
  ],
  CONTENT_APPROVER: [
    "catalog.read",
    "catalog.write",
    "catalog.publish",
    "content.read",
    "content.write",
    "content.publish",
    "media.read",
    "media.write",
    "review.moderate",
    "review.publish",
    "quote.approve",
  ],
  OPERATIONS_MANAGER: [
    "catalog.read",
    "content.read",
    "media.read",
    "enquiry.read.assigned",
    "enquiry.read.all",
    "enquiry.update",
    "enquiry.assign",
    "enquiry.export",
    "quote.read",
    "customer.read",
    "customer.export",
    "newsletter.read",
    "newsletter.write",
    "report.read",
  ],
  ADMINISTRATOR: permissionCodes,
  AUDITOR: [
    "catalog.read",
    "content.read",
    "media.read",
    "enquiry.read.assigned",
    "enquiry.read.all",
    "quote.read",
    "customer.read",
    "newsletter.read",
    "report.read",
    "audit.read",
  ],
};

export function isRoleCode(value: string): value is RoleCode {
  return roleCodes.some((code) => code === value);
}

export function isPermissionCode(value: string): value is PermissionCode {
  return all.has(value as PermissionCode);
}

export function permissionsForRole(role: RoleCode): readonly PermissionCode[] {
  return matrix[role];
}

export function roleHasPermission(role: RoleCode, permission: PermissionCode): boolean {
  return matrix[role].includes(permission);
}
