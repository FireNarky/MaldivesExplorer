export const portalConsentPurposes = [
  "ACCOUNT",
  "ENQUIRY_CONTACT",
  "ANALYTICS",
  "MARKETING",
] as const;

export type PortalConsentPurpose = (typeof portalConsentPurposes)[number];

export const customerVisibleQuoteStatuses = [
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "SUPERSEDED",
  "WITHDRAWN",
] as const;

export type CustomerVisibleQuoteStatus = (typeof customerVisibleQuoteStatuses)[number];

const purposeSet = new Set<string>(portalConsentPurposes);
const visibleQuoteSet = new Set<string>(customerVisibleQuoteStatuses);

export function isPortalConsentPurpose(value: string): value is PortalConsentPurpose {
  return purposeSet.has(value);
}

export function isCustomerVisibleQuote(status: string, sentAt: Date | null): boolean {
  return sentAt !== null && visibleQuoteSet.has(status);
}

export function safeAccountPath(value: string): string | null {
  if (!value.startsWith("/account")) return null;
  if (value.startsWith("//") || value.includes("\\") || value.includes("://")) return null;
  if (value.length > 400) return null;
  return value;
}

export function claimToken(value: string): string {
  return /^[A-Za-z0-9_-]{20,200}$/.test(value) ? value : "";
}

export function formatAmount(value: { toString(): string }): string {
  const raw = value.toString();
  const [whole, fraction = ""] = raw.split(".");
  return `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}`;
}

export function enquiryStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NEW: "Received",
    CONTACT_ATTEMPTED: "Contact attempted",
    CONTACTED: "Contacted",
    QUALIFIED: "Qualified",
    QUOTED: "Quoted",
    NEGOTIATION: "In discussion",
    WON: "Closed",
    LOST: "Closed",
    CLOSED: "Closed",
  };
  return labels[status] ?? status;
}

export function quoteStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SENT: "Sent",
    ACCEPTED: "Accepted",
    DECLINED: "Declined",
    EXPIRED: "Expired",
    SUPERSEDED: "Superseded",
    WITHDRAWN: "Withdrawn",
  };
  return labels[status] ?? status;
}

export function profileProblems(input: {
  name?: string;
  phone?: string;
  countryCode?: string;
  locale?: string;
}): Record<string, string> {
  const problems: Record<string, string> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name || name.length > 120) problems.name = "Enter a name of 120 characters or fewer.";
  }
  if (input.phone !== undefined && input.phone.trim()) {
    const phone = input.phone.trim();
    if (phone.length > 40 || !/^[0-9+().\-\s]+$/.test(phone)) {
      problems.phone = "Enter a phone number of 40 characters or fewer.";
    }
  }
  if (input.countryCode !== undefined && input.countryCode.trim()) {
    if (!/^[A-Za-z]{2}$/.test(input.countryCode.trim())) {
      problems.countryCode = "Enter a two-letter country code.";
    }
  }
  if (input.locale !== undefined && input.locale !== "en") {
    problems.locale = "English is the available language.";
  }
  return problems;
}

export function messageBodyError(body: string): string | null {
  const text = body.trim();
  if (!text) return "Enter a message.";
  if (text.length > 2000) return "Use 2000 characters or fewer.";
  return null;
}

export function consentWrites(
  latest: Partial<Record<PortalConsentPurpose, "GRANTED" | "WITHDRAWN">>,
  updates: Partial<Record<PortalConsentPurpose, boolean>>,
): Array<{ purpose: PortalConsentPurpose; status: "GRANTED" | "WITHDRAWN" }> {
  const writes: Array<{ purpose: PortalConsentPurpose; status: "GRANTED" | "WITHDRAWN" }> = [];
  for (const purpose of portalConsentPurposes) {
    if (updates[purpose] === undefined) continue;
    const status = updates[purpose] ? "GRANTED" : "WITHDRAWN";
    const current = latest[purpose];
    if (!current && status === "WITHDRAWN") continue;
    if (current === status) continue;
    writes.push({ purpose, status });
  }
  return writes;
}

export function consentUpdatesFromList(
  selected: readonly string[],
): Partial<Record<PortalConsentPurpose, boolean>> {
  const chosen = new Set(selected.filter(isPortalConsentPurpose));
  return {
    ACCOUNT: chosen.has("ACCOUNT"),
    ENQUIRY_CONTACT: chosen.has("ENQUIRY_CONTACT"),
    ANALYTICS: chosen.has("ANALYTICS"),
    MARKETING: chosen.has("MARKETING"),
  };
}
