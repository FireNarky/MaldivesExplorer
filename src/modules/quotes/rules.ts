import { zonedToUtc } from "@/modules/crm/rules";

export const quoteCurrency = "USD";
export const quoteTimeZone = "Indian/Maldives";

const itemTypes = [
  "ACCOMMODATION",
  "TRANSFER",
  "EXPERIENCE",
  "TAX",
  "FEE",
  "DISCOUNT",
  "OTHER",
] as const;

const responseTypes = ["CLARIFICATION", "ACCEPT", "DECLINE"] as const;

export type QuoteItemKind = (typeof itemTypes)[number];
export type QuoteResponseKind = (typeof responseTypes)[number];

export type MoneyTotals = {
  subtotalCents: number;
  taxCents: number;
  feeCents: number;
  discountCents: number;
  grandCents: number;
};

export type PricedLine = {
  itemType: QuoteItemKind;
  quantity: number;
  unitCents: number;
  taxCents: number;
  discountCents: number;
  lineCents: number;
};

export type ApprovalPolicy = {
  discountPercent: number;
  grandTotalCents: number;
  separateDuties: boolean;
};

export const defaultApprovalPolicy: ApprovalPolicy = {
  discountPercent: 10,
  grandTotalCents: 2_500_000,
  separateDuties: true,
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export function isItemType(value: string): value is QuoteItemKind {
  return (itemTypes as readonly string[]).includes(value);
}

export function isResponseType(value: string): value is QuoteResponseKind {
  return (responseTypes as readonly string[]).includes(value);
}

export function idempotencyKeyError(value: string): string | null {
  return /^[A-Za-z0-9_-]{8,80}$/.test(value) ? null : "The submission key is not valid.";
}

export function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  if (!whole || whole.length > 10) return null;
  if (/[1-9]/.test(fraction.slice(2))) return null;
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

export function formatMoney(cents: number): string {
  const abs = Math.abs(cents);
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function parseQuantity(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const quantity = Number(trimmed);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return null;
  return quantity;
}

export function priceLine(input: {
  itemType: QuoteItemKind;
  quantity: number;
  unitCents: number;
  taxCents: number;
  discountCents: number;
}): PricedLine | null {
  if (input.unitCents < 0 || input.taxCents < 0 || input.discountCents < 0) return null;
  const product = input.quantity * input.unitCents;
  if (!Number.isSafeInteger(product)) return null;
  if (input.itemType === "DISCOUNT") {
    return {
      itemType: input.itemType,
      quantity: input.quantity,
      unitCents: input.unitCents,
      taxCents: 0,
      discountCents: 0,
      lineCents: product,
    };
  }
  const lineCents = product + input.taxCents - input.discountCents;
  if (lineCents < 0 || !Number.isSafeInteger(lineCents)) return null;
  return {
    itemType: input.itemType,
    quantity: input.quantity,
    unitCents: input.unitCents,
    taxCents: input.taxCents,
    discountCents: input.discountCents,
    lineCents,
  };
}

export function headerFromLines(lines: readonly PricedLine[]): MoneyTotals | null {
  let subtotalCents = 0;
  let taxCents = 0;
  let feeCents = 0;
  let discountCents = 0;
  for (const line of lines) {
    if (line.itemType !== "TAX" && line.itemType !== "FEE" && line.itemType !== "DISCOUNT") {
      subtotalCents += line.quantity * line.unitCents;
    }
    taxCents += line.taxCents;
    if (line.itemType === "TAX") taxCents += line.lineCents;
    if (line.itemType === "FEE") feeCents += line.lineCents;
    discountCents += line.discountCents;
    if (line.itemType === "DISCOUNT") discountCents += line.lineCents;
  }
  const grandCents = subtotalCents + taxCents + feeCents - discountCents;
  if (
    subtotalCents < 0 ||
    taxCents < 0 ||
    feeCents < 0 ||
    discountCents < 0 ||
    grandCents < 0 ||
    !Number.isSafeInteger(grandCents)
  ) {
    return null;
  }
  return { subtotalCents, taxCents, feeCents, discountCents, grandCents };
}

export function needsSecondApprover(totals: MoneyTotals, policy: ApprovalPolicy): boolean {
  const overDiscount =
    totals.subtotalCents > 0 &&
    totals.discountCents * 100 > totals.subtotalCents * policy.discountPercent;
  return overDiscount || totals.grandCents > policy.grandTotalCents;
}

export function approvalDecision(input: {
  actorId: string;
  createdById: string;
  separateDuties: boolean;
  priorApproverIds: readonly string[];
  secondRequired: boolean;
}): "approve" | "record-first" | "self" | "duplicate" {
  if (input.separateDuties && input.actorId === input.createdById) return "self";
  if (input.priorApproverIds.includes(input.actorId)) return "duplicate";
  if (input.secondRequired && input.priorApproverIds.length === 0) return "record-first";
  return "approve";
}

export function senderIsApprover(actorId: string, approverIds: readonly string[]): boolean {
  return approverIds.includes(actorId);
}

export function acceptDecision(
  status: string,
  expiresAt: Date,
  now: Date,
): "ok" | "expired" | "state" {
  if (status !== "SENT") return "state";
  if (expiresAt.getTime() <= now.getTime()) return "expired";
  return "ok";
}

export function sentVersionIsFrozen(sentAt: Date | null): boolean {
  return sentAt !== null;
}

export function expiryFromDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = zonedToUtc(year, month, day, 23, 59, quoteTimeZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function defaultExpiry(from = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: quoteTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(from);
  const [year, month, day] = parts.split("-").map(Number);
  const later = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, (day ?? 1) + 14));
  return zonedToUtc(
    later.getUTCFullYear(),
    later.getUTCMonth() + 1,
    later.getUTCDate(),
    23,
    59,
    quoteTimeZone,
  );
}

export function composeTerms(input: {
  inclusions: string;
  exclusions: string;
  terms: string;
}): string {
  return `Inclusions:\n${input.inclusions.trim()}\n\nExclusions:\n${input.exclusions.trim()}\n\nTerms:\n${input.terms.trim()}`;
}

export function splitTerms(snapshot: string): {
  inclusions: string;
  exclusions: string;
  terms: string;
} {
  const exclusionsAt = snapshot.indexOf("\n\nExclusions:\n");
  const termsAt = snapshot.indexOf("\n\nTerms:\n");
  if (!snapshot.startsWith("Inclusions:\n") || exclusionsAt < 0 || termsAt < exclusionsAt) {
    return { inclusions: "", exclusions: "", terms: snapshot };
  }
  return {
    inclusions: snapshot.slice("Inclusions:\n".length, exclusionsAt),
    exclusions: snapshot.slice(exclusionsAt + "\n\nExclusions:\n".length, termsAt),
    terms: snapshot.slice(termsAt + "\n\nTerms:\n".length),
  };
}

export function staffQuoteStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    IN_REVIEW: "In review",
    APPROVED: "Approved",
    SENT: "Sent",
    ACCEPTED: "Accepted",
    DECLINED: "Declined",
    EXPIRED: "Expired",
    SUPERSEDED: "Superseded",
    WITHDRAWN: "Withdrawn",
  };
  return labels[status] ?? status;
}

export function responseLabel(responseType: string): string {
  if (responseType === "ACCEPT") return "Accepted";
  if (responseType === "DECLINE") return "Declined";
  return "Clarification";
}

export function historyLabel(action: string, after: unknown): string {
  const record = after && typeof after === "object" && !Array.isArray(after) ? after : {};
  const stage = "stage" in record ? String(record.stage) : "";
  const responseType = "responseType" in record ? String(record.responseType) : "";
  const status = "status" in record ? String(record.status) : "";
  if (action === "quote.create") return "Quote created";
  if (action === "quote.version") return "New version started";
  if (action === "quote.submit") return "Submitted for approval";
  if (action === "quote.withdraw") return "Returned to draft";
  if (action === "quote.approve") {
    return stage === "first" ? "First approval recorded" : "Approved";
  }
  if (action === "quote.send") return "Sent";
  if (action === "quote.supersede") return "Marked superseded";
  if (action === "quote.response") return responseLabel(responseType);
  if (action === "quote.expire") return "Expired";
  if (action === "quote.status") return `Status set to ${staffQuoteStatusLabel(status)}`;
  if (action === "quote.draft") return "Draft updated";
  return "Quote updated";
}

export type QuoteDocument = {
  reference: string;
  versionNo: number;
  currency: string;
  welcome: string;
  overview: string;
  segments: Array<{
    dates: string;
    resort: string;
    room: string | null;
    meal: string | null;
    transfer: string | null;
    notes: string | null;
  }>;
  transfers: string[];
  activities: string[];
  lines: Array<{ description: string; amount: string }>;
  subtotal: string;
  taxTotal: string;
  feeTotal: string;
  discountTotal: string;
  grandTotal: string;
  terms: string;
  expiresOn: string;
};

export function documentText(document: QuoteDocument): string[] {
  const lines = [
    "Maldives Explorer",
    `Quote ${document.reference}`,
    `Version ${document.versionNo}`,
    "",
    "Welcome",
    document.welcome,
    "",
    "Overview",
    document.overview || "Not added",
    "",
    "Accommodation",
  ];
  if (document.segments.length === 0) lines.push("No stay is listed.");
  for (const segment of document.segments) {
    lines.push(segment.dates, segment.resort);
    if (segment.room) lines.push(segment.room);
    if (segment.meal) lines.push(segment.meal);
    if (segment.notes) lines.push(segment.notes);
    lines.push("");
  }
  lines.push("Transfers");
  lines.push(
    ...(document.transfers.length === 0 ? ["No transfer is listed."] : document.transfers),
  );
  lines.push("", "Activities");
  lines.push(
    ...(document.activities.length === 0 ? ["No activity is listed."] : document.activities),
  );
  lines.push("", "Pricing", document.currency);
  for (const line of document.lines) lines.push(`${line.description}  ${line.amount}`);
  lines.push(
    `Subtotal  ${document.subtotal}`,
    `Tax  ${document.taxTotal}`,
    `Fees  ${document.feeTotal}`,
    `Discounts  ${document.discountTotal}`,
    `Total  ${document.grandTotal}`,
    "",
    "Terms",
    document.terms,
    `Valid through ${document.expiresOn}.`,
    "",
    "Next steps",
    "Accept or decline this version in your account before it expires. Acceptance records your choice. A consultant confirms any reservation with the resort.",
  );
  return lines;
}
