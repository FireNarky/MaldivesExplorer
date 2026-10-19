export const moduleStatus = "implemented" as const;

export function canReadQuote(
  permissions: readonly string[],
  userId: string,
  assignedUserId: string | null,
): boolean {
  if (permissions.includes("quote.approve")) return true;
  if (permissions.includes("enquiry.read.all") && permissions.includes("quote.read")) return true;
  if (
    permissions.includes("quote.read") ||
    permissions.includes("quote.write") ||
    permissions.includes("quote.send")
  ) {
    return assignedUserId !== null && assignedUserId === userId;
  }
  return false;
}

export function canWriteQuote(
  permissions: readonly string[],
  userId: string,
  assignedUserId: string | null,
): boolean {
  if (!permissions.includes("quote.write")) return false;
  if (permissions.includes("enquiry.read.all")) return true;
  return assignedUserId !== null && assignedUserId === userId;
}

export function canApproveQuote(permissions: readonly string[]): boolean {
  return permissions.includes("quote.approve");
}

export function canSendQuote(permissions: readonly string[]): boolean {
  return permissions.includes("quote.send");
}
