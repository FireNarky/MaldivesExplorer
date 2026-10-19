import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/modules/audit/service";
import { permissionsForUser } from "@/modules/identity/service";
import { isCustomerVisibleQuote } from "@/modules/customers/rules";
import { mediaStorage } from "@/modules/media/storage";
import { renderQuotePdf } from "@/modules/quotes/pdf";
import {
  canApproveQuote,
  canReadQuote,
  canSendQuote,
  canWriteQuote,
} from "@/modules/quotes/policies";
import {
  acceptDecision,
  approvalDecision,
  composeTerms,
  defaultApprovalPolicy,
  defaultExpiry,
  documentText,
  expiryFromDate,
  formatMoney,
  headerFromLines,
  historyLabel,
  idempotencyKeyError,
  isItemType,
  isResponseType,
  isUuid,
  needsSecondApprover,
  parseMoney,
  parseQuantity,
  priceLine,
  quoteCurrency,
  responseLabel,
  senderIsApprover,
  sentVersionIsFrozen,
  splitTerms,
  staffQuoteStatusLabel,
  type ApprovalPolicy,
  type MoneyTotals,
  type PricedLine,
  type QuoteDocument,
} from "@/modules/quotes/rules";

export const moduleStatus = "implemented" as const;

const unavailable = "That record is not available.";

export class QuoteError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "QuoteError";
    this.status = status;
  }
}

export type QuoteListRow = {
  id: string;
  reference: string;
  enquiryReference: string;
  statusLabel: string;
  versionNo: number;
  grandTotal: string;
};

export type EnquiryQuoteLinks = {
  canCreate: boolean;
  quotes: Array<{ id: string; reference: string; statusLabel: string; versionNo: number }>;
};

export type QuoteHistoryEntry = { id: string; label: string; at: string };

export type QuoteVersionView = {
  id: string;
  versionNo: number;
  status: string;
  statusLabel: string;
  revision: number;
  currency: string;
  welcome: string;
  overview: string;
  inclusions: string;
  exclusions: string;
  terms: string;
  expiresOn: string;
  subtotal: string;
  taxTotal: string;
  feeTotal: string;
  discountTotal: string;
  grandTotal: string;
  pdfAvailable: boolean;
  preparedByYou: boolean;
  lines: Array<{
    id: string;
    itemType: string;
    description: string;
    quantity: string;
    unitAmount: string;
    taxAmount: string;
    discountAmount: string;
    lineTotal: string;
  }>;
  segments: Array<{
    id: string;
    startDate: string;
    endDate: string;
    resort: string;
    transfer: string | null;
    notes: string | null;
  }>;
  responses: Array<{ label: string; message: string | null; createdAt: string }>;
};

export type QuoteDetail = {
  id: string;
  reference: string;
  enquiryReference: string;
  canEdit: boolean;
  canWithdraw: boolean;
  canStartVersion: boolean;
  canApprove: boolean;
  canSend: boolean;
  needsSecondApprover: boolean;
  approvalWaiting: boolean;
  versions: Array<{ id: string; versionNo: number; statusLabel: string }>;
  history: QuoteHistoryEntry[];
  version: QuoteVersionView;
  resorts: Array<{ id: string; name: string }>;
  meals: Array<{ id: string; label: string }>;
};

export type QuoteCommandResult = {
  quoteId: string;
  versionId: string;
  reference: string;
};

export type ApprovalResult = {
  versionId: string;
  status: "IN_REVIEW" | "APPROVED";
  stage: "first" | "final";
};

export type SendResult = {
  versionId: string;
  status: "SENT";
  pdfMediaId: string;
  replayed: boolean;
};

export type CustomerQuoteResponse = {
  versionId: string;
  status: string;
  responseType: string;
  responseId: string;
};

type VersionRecord = {
  id: string;
  quoteId: string;
  versionNo: number;
  status: string;
  revision: number;
  sentAt: Date | null;
  expiresAt: Date;
  createdById: string;
  approvedById: string | null;
  subtotal: { toString(): string };
  taxTotal: { toString(): string };
  feeTotal: { toString(): string };
  discountTotal: { toString(): string };
  grandTotal: { toString(): string };
};

const openStatuses = new Set([
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "SUPERSEDED",
  "WITHDRAWN",
]);

function rethrowQuote(error: unknown): never {
  if (error instanceof QuoteError) throw error;
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("lines on a sent quote version cannot change") ||
    message.includes("sent quote versions are immutable")
  ) {
    throw new QuoteError("A sent version stays as sent. Start a new version.", 409);
  }
  if (message.includes("quote totals do not match")) {
    throw new QuoteError("The totals do not match the lines.", 409);
  }
  if (message.includes("quote response customer must own the enquiry")) {
    throw new QuoteError(unavailable, 404);
  }
  throw error;
}

function cents(value: { toString(): string }): number {
  const parsed = parseMoney(value.toString());
  if (parsed === null) throw new QuoteError("The totals do not match the lines.", 409);
  return parsed;
}

function money(currency: string, value: { toString(): string }): string {
  return `${currency} ${formatMoney(cents(value))}`;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function calendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function clip(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length > max) throw new QuoteError(`${label} is too long.`, 400);
  return trimmed;
}

function totalsOf(version: VersionRecord): MoneyTotals {
  return {
    subtotalCents: cents(version.subtotal),
    taxCents: cents(version.taxTotal),
    feeCents: cents(version.feeTotal),
    discountCents: cents(version.discountTotal),
    grandCents: cents(version.grandTotal),
  };
}

async function approvalPolicy(): Promise<ApprovalPolicy> {
  const rows = await db.systemSetting.findMany({
    where: {
      key: {
        in: [
          "quote.approval.discountPercent",
          "quote.approval.grandTotalUsd",
          "requireSeparationOfDuties",
        ],
      },
    },
  });
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const percent = values.get("quote.approval.discountPercent");
  const total = values.get("quote.approval.grandTotalUsd");
  const separate = values.get("requireSeparationOfDuties");
  return {
    discountPercent:
      typeof percent === "number" && percent >= 0 ? percent : defaultApprovalPolicy.discountPercent,
    grandTotalCents:
      typeof total === "number" && total >= 0
        ? Math.round(total * 100)
        : defaultApprovalPolicy.grandTotalCents,
    separateDuties: typeof separate === "boolean" ? separate : defaultApprovalPolicy.separateDuties,
  };
}

async function priorApproverIds(
  client: Prisma.TransactionClient | typeof db,
  versionId: string,
): Promise<string[]> {
  const submit = await client.auditLog.findFirst({
    where: { entityType: "quote_version", entityId: versionId, action: "quote.submit" },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });
  const rows = await client.auditLog.findMany({
    where: {
      entityType: "quote_version",
      entityId: versionId,
      action: "quote.approve",
      ...(submit ? { occurredAt: { gte: submit.occurredAt } } : {}),
    },
    select: { actorId: true },
  });
  return rows.flatMap((row) => (row.actorId ? [row.actorId] : []));
}

async function lockVersion(tx: Prisma.TransactionClient, versionId: string): Promise<void> {
  if (!isUuid(versionId)) throw new QuoteError(unavailable, 404);
  await tx.$queryRaw`SELECT id FROM quote_versions WHERE id = ${versionId}::uuid FOR UPDATE`;
}

async function nextReference(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ n: bigint }>>`SELECT nextval('quote_reference_seq') AS n`;
  const value = rows[0]?.n;
  if (value === undefined) throw new QuoteError("The quote reference could not be issued.", 500);
  return `ME-Q-${String(value).padStart(6, "0")}`;
}

function quantityFromDecimal(value: { toString(): string }): number | null {
  const [whole, fraction = ""] = value.toString().split(".");
  if (fraction && /[1-9]/.test(fraction)) return null;
  return parseQuantity(whole ?? "");
}

async function syncTotals(tx: Prisma.TransactionClient, versionId: string): Promise<void> {
  const items = await tx.quoteItem.findMany({ where: { quoteVersionId: versionId } });
  const priced: PricedLine[] = [];
  for (const item of items) {
    if (!isItemType(item.itemType)) throw new QuoteError("The totals do not match the lines.", 409);
    const quantity = quantityFromDecimal(item.quantity);
    const unitCents = parseMoney(item.unitAmount.toString());
    const taxCents = parseMoney(item.taxAmount.toString());
    const discountCents = parseMoney(item.discountAmount.toString());
    if (quantity === null || unitCents === null || taxCents === null || discountCents === null) {
      throw new QuoteError("The totals do not match the lines.", 409);
    }
    const line = priceLine({
      itemType: item.itemType,
      quantity,
      unitCents,
      taxCents,
      discountCents,
    });
    if (!line) throw new QuoteError("The totals do not match the lines.", 409);
    priced.push(line);
  }
  const totals = headerFromLines(priced);
  if (!totals) throw new QuoteError("The totals do not match the lines.", 409);
  await tx.quoteVersion.update({
    where: { id: versionId },
    data: {
      subtotal: formatMoney(totals.subtotalCents),
      taxTotal: formatMoney(totals.taxCents),
      feeTotal: formatMoney(totals.feeCents),
      discountTotal: formatMoney(totals.discountCents),
      grandTotal: formatMoney(totals.grandCents),
      revision: { increment: 1 },
    },
  });
}

async function draftVersion(tx: Prisma.TransactionClient, quoteId: string): Promise<VersionRecord> {
  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    select: { activeVersionId: true },
  });
  if (!quote?.activeVersionId) throw new QuoteError(unavailable, 404);
  await lockVersion(tx, quote.activeVersionId);
  const version = await tx.quoteVersion.findUnique({ where: { id: quote.activeVersionId } });
  if (!version) throw new QuoteError(unavailable, 404);
  if (sentVersionIsFrozen(version.sentAt) || version.status !== "DRAFT") {
    throw new QuoteError("A sent version stays as sent. Start a new version.", 409);
  }
  return version;
}

export async function listQuotes(userId: string): Promise<QuoteListRow[]> {
  const permissions = await permissionsForUser(userId);
  const seesAll =
    permissions.includes("quote.approve") ||
    (permissions.includes("quote.read") && permissions.includes("enquiry.read.all"));
  const assignedOnly =
    !seesAll &&
    (permissions.includes("quote.read") ||
      permissions.includes("quote.write") ||
      permissions.includes("quote.send"));
  if (!seesAll && !assignedOnly) throw new QuoteError(unavailable, 404);
  const rows = await db.quote.findMany({
    where: assignedOnly ? { enquiry: { assignedUserId: userId } } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      reference: true,
      enquiry: { select: { reference: true } },
      activeVersion: {
        select: { versionNo: true, status: true, currency: true, grandTotal: true },
      },
    },
  });
  return rows.flatMap((row) => {
    if (!row.activeVersion) return [];
    return [
      {
        id: row.id,
        reference: row.reference,
        enquiryReference: row.enquiry.reference,
        statusLabel: staffQuoteStatusLabel(row.activeVersion.status),
        versionNo: row.activeVersion.versionNo,
        grandTotal: money(row.activeVersion.currency, row.activeVersion.grandTotal),
      },
    ];
  });
}

export async function listEnquiryQuotes(
  userId: string,
  reference: string,
): Promise<EnquiryQuoteLinks> {
  const permissions = await permissionsForUser(userId);
  const enquiry = await db.enquiry.findUnique({
    where: { reference },
    select: {
      assignedUserId: true,
      quotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reference: true,
          activeVersion: { select: { versionNo: true, status: true } },
        },
      },
    },
  });
  if (
    !enquiry ||
    (!canReadQuote(permissions, userId, enquiry.assignedUserId) &&
      !canWriteQuote(permissions, userId, enquiry.assignedUserId))
  ) {
    throw new QuoteError(unavailable, 404);
  }
  return {
    canCreate: canWriteQuote(permissions, userId, enquiry.assignedUserId),
    quotes: enquiry.quotes.flatMap((quote) => {
      if (!quote.activeVersion) return [];
      return [
        {
          id: quote.id,
          reference: quote.reference,
          statusLabel: staffQuoteStatusLabel(quote.activeVersion.status),
          versionNo: quote.activeVersion.versionNo,
        },
      ];
    }),
  };
}

export async function readQuote(
  userId: string,
  quoteId: string,
  versionId?: string | null,
): Promise<QuoteDetail> {
  if (!isUuid(quoteId) || (versionId && !isUuid(versionId))) throw new QuoteError(unavailable, 404);
  const permissions = await permissionsForUser(userId);
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: {
      enquiry: { select: { reference: true, assignedUserId: true } },
      versions: {
        orderBy: { versionNo: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          items: { orderBy: { sortOrder: "asc" } },
          segments: {
            orderBy: { sortOrder: "asc" },
            include: { resort: { select: { name: true } } },
          },
          responses: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!quote || !canReadQuote(permissions, userId, quote.enquiry.assignedUserId)) {
    throw new QuoteError(unavailable, 404);
  }
  const selected =
    quote.versions.find((version) => version.id === (versionId || quote.activeVersionId)) ??
    quote.versions[0];
  if (!selected) throw new QuoteError(unavailable, 404);
  const active = quote.versions.find((version) => version.id === quote.activeVersionId) ?? selected;
  const policy = await approvalPolicy();
  const approvers = await priorApproverIds(db, active.id);
  const second = needsSecondApprover(totalsOf(active), policy);
  const writable = canWriteQuote(permissions, userId, quote.enquiry.assignedUserId);
  const [resorts, meals, audits] = await Promise.all([
    db.resort.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
      take: 50,
      select: { id: true, name: true },
    }),
    db.vocabularyItem.findMany({
      where: { set: "MEAL_PLAN" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true },
    }),
    db.auditLog.findMany({
      where: {
        action: { startsWith: "quote." },
        OR: [
          { entityType: "quote", entityId: quote.id },
          {
            entityType: "quote_version",
            entityId: { in: quote.versions.map((version) => version.id) },
          },
        ],
      },
      orderBy: { occurredAt: "desc" },
      take: 40,
      select: { id: true, action: true, after: true, occurredAt: true },
    }),
  ]);
  const terms = splitTerms(selected.termsSnapshot);
  const viewingActive = selected.id === active.id;
  const decision = approvalDecision({
    actorId: userId,
    createdById: active.createdById,
    separateDuties: policy.separateDuties,
    priorApproverIds: approvers,
    secondRequired: second,
  });
  const approverIds = active.approvedById ? [...approvers, active.approvedById] : approvers;
  return {
    id: quote.id,
    reference: quote.reference,
    enquiryReference: quote.enquiry.reference,
    canEdit: writable && viewingActive && selected.status === "DRAFT",
    canWithdraw:
      writable && viewingActive && (active.status === "IN_REVIEW" || active.status === "APPROVED"),
    canStartVersion: writable && viewingActive && openStatuses.has(active.status),
    canApprove:
      viewingActive &&
      canApproveQuote(permissions) &&
      active.status === "IN_REVIEW" &&
      decision !== "self" &&
      decision !== "duplicate",
    canSend:
      viewingActive &&
      canSendQuote(permissions) &&
      active.status === "APPROVED" &&
      active.approvedById !== null &&
      active.expiresAt.getTime() > Date.now() &&
      !senderIsApprover(userId, approverIds),
    needsSecondApprover: second,
    approvalWaiting: active.status === "IN_REVIEW" && approvers.length > 0,
    versions: quote.versions.map((version) => ({
      id: version.id,
      versionNo: version.versionNo,
      statusLabel: staffQuoteStatusLabel(version.status),
    })),
    history: audits.map((entry) => ({
      id: entry.id,
      label: historyLabel(entry.action, entry.after),
      at: entry.occurredAt.toISOString(),
    })),
    version: {
      id: selected.id,
      versionNo: selected.versionNo,
      status: selected.status,
      statusLabel: staffQuoteStatusLabel(selected.status),
      revision: selected.revision,
      currency: selected.currency,
      welcome: selected.welcomeMessage ?? "",
      overview: selected.overview ?? "",
      inclusions: terms.inclusions,
      exclusions: terms.exclusions,
      terms: terms.terms,
      expiresOn: dateOnly(selected.expiresAt),
      subtotal: money(selected.currency, selected.subtotal),
      taxTotal: money(selected.currency, selected.taxTotal),
      feeTotal: money(selected.currency, selected.feeTotal),
      discountTotal: money(selected.currency, selected.discountTotal),
      grandTotal: money(selected.currency, selected.grandTotal),
      pdfAvailable: selected.pdfMediaId !== null && selected.sentAt !== null,
      preparedByYou: selected.createdById === userId,
      lines: selected.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        description: item.description,
        quantity: String(quantityFromDecimal(item.quantity) ?? item.quantity.toString()),
        unitAmount: formatMoney(cents(item.unitAmount)),
        taxAmount: formatMoney(cents(item.taxAmount)),
        discountAmount: formatMoney(cents(item.discountAmount)),
        lineTotal: money(selected.currency, item.lineTotal),
      })),
      segments: selected.segments.map((segment) => ({
        id: segment.id,
        startDate: dateOnly(segment.startDate),
        endDate: dateOnly(segment.endDate),
        resort: segment.resort?.name ?? "Not added",
        transfer: segment.transferSummary,
        notes: segment.notes,
      })),
      responses: selected.responses.map((response) => ({
        label: responseLabel(response.responseType),
        message: response.message,
        createdAt: response.createdAt.toISOString(),
      })),
    },
    resorts: resorts.map((resort) => ({ id: resort.id, name: resort.name })),
    meals: meals.map((meal) => ({ id: meal.id, label: meal.label })),
  };
}

export async function createQuote(userId: string, reference: string): Promise<QuoteCommandResult> {
  const permissions = await permissionsForUser(userId);
  const enquiry = await db.enquiry.findUnique({
    where: { reference },
    select: { id: true, assignedUserId: true },
  });
  if (!enquiry || !canWriteQuote(permissions, userId, enquiry.assignedUserId)) {
    throw new QuoteError(unavailable, 404);
  }
  try {
    return await db.$transaction(async (tx) => {
      const quoteReference = await nextReference(tx);
      const quote = await tx.quote.create({
        data: { enquiryId: enquiry.id, reference: quoteReference },
        select: { id: true },
      });
      const version = await tx.quoteVersion.create({
        data: {
          quoteId: quote.id,
          versionNo: 1,
          currency: quoteCurrency,
          subtotal: "0.00",
          taxTotal: "0.00",
          feeTotal: "0.00",
          discountTotal: "0.00",
          grandTotal: "0.00",
          termsSnapshot: composeTerms({ inclusions: "", exclusions: "", terms: "" }),
          expiresAt: defaultExpiry(),
          status: "DRAFT",
          createdById: userId,
        },
        select: { id: true },
      });
      await tx.quote.update({
        where: { id: quote.id },
        data: { activeVersionId: version.id },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "quote.create",
          entityType: "quote",
          entityId: quote.id,
          after: { reference: quoteReference, versionId: version.id },
        },
        tx,
      );
      return { quoteId: quote.id, versionId: version.id, reference: quoteReference };
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function saveDraft(
  userId: string,
  quoteId: string,
  input: {
    welcome: string;
    overview: string;
    inclusions: string;
    exclusions: string;
    terms: string;
    expiresOn: string;
  },
): Promise<void> {
  const permissions = await permissionsForUser(userId);
  const quote = await accessQuote(userId, quoteId, permissions, true);
  const expiresAt = expiryFromDate(input.expiresOn);
  if (!expiresAt) throw new QuoteError("Choose the expiry date.", 400);
  const welcome = clip(input.welcome, 2000, "The welcome");
  const overview = clip(input.overview, 4000, "The overview");
  const termsSnapshot = composeTerms({
    inclusions: clip(input.inclusions, 2000, "The inclusions"),
    exclusions: clip(input.exclusions, 2000, "The exclusions"),
    terms: clip(input.terms, 8000, "The terms"),
  });
  try {
    await db.$transaction(async (tx) => {
      const version = await draftVersion(tx, quote.id);
      await tx.quoteVersion.update({
        where: { id: version.id },
        data: {
          welcomeMessage: welcome || null,
          overview: overview || null,
          termsSnapshot,
          expiresAt,
          revision: { increment: 1 },
        },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "quote.draft",
          entityType: "quote_version",
          entityId: version.id,
          after: { quoteId: quote.id },
        },
        tx,
      );
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function addSegment(
  userId: string,
  quoteId: string,
  input: {
    startDate: string;
    endDate: string;
    resortId: string;
    mealPlanId: string;
    transfer: string;
    notes: string;
  },
): Promise<void> {
  const start = calendarDate(input.startDate);
  const end = calendarDate(input.endDate);
  if (!start || !end || end.getTime() < start.getTime()) {
    throw new QuoteError("Choose dates that run in order.", 400);
  }
  const resortId = input.resortId.trim();
  const mealPlanId = input.mealPlanId.trim();
  if (resortId && !isUuid(resortId)) throw new QuoteError("Choose a resort.", 400);
  if (mealPlanId && !isUuid(mealPlanId)) throw new QuoteError("Choose a meal plan.", 400);
  if (resortId) {
    const resort = await db.resort.findUnique({ where: { id: resortId }, select: { id: true } });
    if (!resort) throw new QuoteError("Choose a resort.", 400);
  }
  if (mealPlanId) {
    const meal = await db.vocabularyItem.findFirst({
      where: { id: mealPlanId, set: "MEAL_PLAN" },
      select: { id: true },
    });
    if (!meal) throw new QuoteError("Choose a meal plan.", 400);
  }
  const transfer = clip(input.transfer, 500, "The transfer");
  const notes = clip(input.notes, 2000, "The notes");
  const permissions = await permissionsForUser(userId);
  const quote = await accessQuote(userId, quoteId, permissions, true);
  try {
    await db.$transaction(async (tx) => {
      const version = await draftVersion(tx, quote.id);
      const last = await tx.itinerarySegment.findFirst({
        where: { quoteVersionId: version.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      await tx.itinerarySegment.create({
        data: {
          quoteVersionId: version.id,
          sortOrder: (last?.sortOrder ?? 0) + 1,
          resortId: resortId || null,
          mealPlanId: mealPlanId || null,
          startDate: start,
          endDate: end,
          transferSummary: transfer || null,
          notes: notes || null,
        },
      });
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function removeSegment(
  userId: string,
  quoteId: string,
  segmentId: string,
): Promise<void> {
  if (!isUuid(segmentId)) throw new QuoteError(unavailable, 404);
  const permissions = await permissionsForUser(userId);
  const quote = await accessQuote(userId, quoteId, permissions, true);
  try {
    await db.$transaction(async (tx) => {
      const version = await draftVersion(tx, quote.id);
      const segment = await tx.itinerarySegment.findFirst({
        where: { id: segmentId, quoteVersionId: version.id },
        select: { id: true },
      });
      if (!segment) throw new QuoteError(unavailable, 404);
      await tx.itinerarySegment.delete({ where: { id: segment.id } });
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function addItem(
  userId: string,
  quoteId: string,
  input: {
    itemType: string;
    description: string;
    quantity: string;
    unitAmount: string;
    taxAmount: string;
    discountAmount: string;
  },
): Promise<void> {
  if (!isItemType(input.itemType)) throw new QuoteError("Choose a line type.", 400);
  const description = clip(input.description, 500, "The description");
  if (!description) throw new QuoteError("Describe the line.", 400);
  const quantity = parseQuantity(input.quantity);
  const unitCents = parseMoney(input.unitAmount);
  const taxCents = parseMoney(input.taxAmount || "0");
  const discountCents = parseMoney(input.discountAmount || "0");
  if (quantity === null || unitCents === null || taxCents === null || discountCents === null) {
    throw new QuoteError("Enter the quantity and amounts in USD.", 400);
  }
  const line = priceLine({
    itemType: input.itemType,
    quantity,
    unitCents,
    taxCents,
    discountCents,
  });
  if (!line) throw new QuoteError("The line total cannot be negative.", 400);
  const permissions = await permissionsForUser(userId);
  const quote = await accessQuote(userId, quoteId, permissions, true);
  try {
    await db.$transaction(async (tx) => {
      const version = await draftVersion(tx, quote.id);
      const last = await tx.quoteItem.findFirst({
        where: { quoteVersionId: version.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      await tx.quoteItem.create({
        data: {
          quoteVersionId: version.id,
          itemType: line.itemType,
          description,
          quantity: `${line.quantity}.00`,
          unitAmount: formatMoney(line.unitCents),
          taxAmount: formatMoney(line.taxCents),
          discountAmount: formatMoney(line.discountCents),
          lineTotal: formatMoney(line.lineCents),
          sortOrder: (last?.sortOrder ?? 0) + 1,
        },
      });
      await syncTotals(tx, version.id);
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function removeItem(userId: string, quoteId: string, itemId: string): Promise<void> {
  if (!isUuid(itemId)) throw new QuoteError(unavailable, 404);
  const permissions = await permissionsForUser(userId);
  const quote = await accessQuote(userId, quoteId, permissions, true);
  try {
    await db.$transaction(async (tx) => {
      const version = await draftVersion(tx, quote.id);
      const item = await tx.quoteItem.findFirst({
        where: { id: itemId, quoteVersionId: version.id },
        select: { id: true },
      });
      if (!item) throw new QuoteError(unavailable, 404);
      await tx.quoteItem.delete({ where: { id: item.id } });
      await syncTotals(tx, version.id);
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function submitForReview(userId: string, quoteId: string): Promise<void> {
  const permissions = await permissionsForUser(userId);
  const quote = await accessQuote(userId, quoteId, permissions, true);
  try {
    await db.$transaction(async (tx) => {
      const version = await draftVersion(tx, quote.id);
      const full = await tx.quoteVersion.findUnique({
        where: { id: version.id },
        include: { items: { select: { id: true } } },
      });
      if (!full) throw new QuoteError(unavailable, 404);
      const terms = splitTerms(full.termsSnapshot);
      if (!full.welcomeMessage?.trim()) throw new QuoteError("Write a welcome.", 400);
      if (!terms.terms.trim()) throw new QuoteError("Write the terms.", 400);
      if (full.expiresAt.getTime() <= Date.now()) {
        throw new QuoteError("Choose an expiry that is still ahead.", 400);
      }
      if (full.items.length === 0) throw new QuoteError("Add a priced line.", 400);
      await tx.quoteVersion.update({
        where: { id: full.id },
        data: { status: "IN_REVIEW", revision: { increment: 1 } },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "quote.submit",
          entityType: "quote_version",
          entityId: full.id,
          after: { status: "IN_REVIEW" },
        },
        tx,
      );
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function withdrawVersion(userId: string, quoteId: string): Promise<void> {
  const permissions = await permissionsForUser(userId);
  const quote = await accessQuote(userId, quoteId, permissions, true);
  try {
    await db.$transaction(async (tx) => {
      if (!quote.activeVersionId) throw new QuoteError(unavailable, 404);
      await lockVersion(tx, quote.activeVersionId);
      const version = await tx.quoteVersion.findUnique({ where: { id: quote.activeVersionId } });
      if (!version || sentVersionIsFrozen(version.sentAt)) {
        throw new QuoteError("A sent version stays as sent. Start a new version.", 409);
      }
      if (version.status !== "IN_REVIEW" && version.status !== "APPROVED") {
        throw new QuoteError("This version is already a draft.", 409);
      }
      await tx.quoteVersion.update({
        where: { id: version.id },
        data: {
          status: "DRAFT",
          approvedById: null,
          approvedAt: null,
          revision: { increment: 1 },
        },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "quote.withdraw",
          entityType: "quote_version",
          entityId: version.id,
          before: { status: version.status },
          after: { status: "DRAFT" },
        },
        tx,
      );
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function approveVersion(userId: string, versionId: string): Promise<ApprovalResult> {
  if (!isUuid(versionId)) throw new QuoteError(unavailable, 404);
  const permissions = await permissionsForUser(userId);
  if (!canApproveQuote(permissions)) throw new QuoteError("You cannot approve this quote.", 403);
  const version = await db.quoteVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      quote: { select: { id: true, enquiry: { select: { assignedUserId: true } } } },
    },
  });
  if (!version || !canReadQuote(permissions, userId, version.quote.enquiry.assignedUserId)) {
    throw new QuoteError(unavailable, 404);
  }
  try {
    return await db.$transaction(async (tx) => {
      await lockVersion(tx, versionId);
      const current = await tx.quoteVersion.findUnique({ where: { id: versionId } });
      if (!current) throw new QuoteError(unavailable, 404);
      if (current.status !== "IN_REVIEW") {
        throw new QuoteError("This version is not waiting for approval.", 409);
      }
      const policy = await approvalPolicy();
      const approvers = await priorApproverIds(tx, current.id);
      const decision = approvalDecision({
        actorId: userId,
        createdById: current.createdById,
        separateDuties: policy.separateDuties,
        priorApproverIds: approvers,
        secondRequired: needsSecondApprover(totalsOf(current), policy),
      });
      if (decision === "self") {
        throw new QuoteError("The person who prepared this version cannot approve it.", 403);
      }
      if (decision === "duplicate") throw new QuoteError("A second approver is required.", 409);
      if (decision === "record-first") {
        await writeAudit(
          {
            actorId: userId,
            action: "quote.approve",
            entityType: "quote_version",
            entityId: current.id,
            after: { stage: "first", approverId: userId },
          },
          tx,
        );
        return { versionId: current.id, status: "IN_REVIEW" as const, stage: "first" as const };
      }
      const approvedAt = new Date();
      await tx.quoteVersion.update({
        where: { id: current.id },
        data: {
          status: "APPROVED",
          approvedById: userId,
          approvedAt,
          revision: { increment: 1 },
        },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "quote.approve",
          entityType: "quote_version",
          entityId: current.id,
          after: { stage: "final", approverId: userId, status: "APPROVED" },
        },
        tx,
      );
      return { versionId: current.id, status: "APPROVED" as const, stage: "final" as const };
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function sendVersion(userId: string, versionId: string): Promise<SendResult> {
  if (!isUuid(versionId)) throw new QuoteError(unavailable, 404);
  const permissions = await permissionsForUser(userId);
  if (!canSendQuote(permissions)) throw new QuoteError("You cannot send this quote.", 403);
  const existing = await db.quoteVersion.findUnique({
    where: { id: versionId },
    include: {
      quote: {
        select: {
          id: true,
          reference: true,
          enquiry: {
            select: {
              assignedUserId: true,
              customer: { select: { email: true } },
            },
          },
        },
      },
    },
  });
  if (!existing || !canReadQuote(permissions, userId, existing.quote.enquiry.assignedUserId)) {
    throw new QuoteError(unavailable, 404);
  }
  if (existing.status === "SENT" && existing.sentAt && existing.pdfMediaId) {
    return {
      versionId: existing.id,
      status: "SENT",
      pdfMediaId: existing.pdfMediaId,
      replayed: true,
    };
  }
  try {
    return await db.$transaction(async (tx) => {
      await lockVersion(tx, versionId);
      const current = await tx.quoteVersion.findUnique({
        where: { id: versionId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          segments: {
            orderBy: { sortOrder: "asc" },
            include: {
              resort: { select: { name: true, status: true } },
              roomType: { select: { name: true } },
              mealPlan: { select: { label: true } },
            },
          },
          quote: {
            select: {
              id: true,
              reference: true,
              enquiry: { select: { customer: { select: { email: true } } } },
            },
          },
        },
      });
      if (!current) throw new QuoteError(unavailable, 404);
      if (current.status === "SENT" && current.sentAt && current.pdfMediaId) {
        return {
          versionId: current.id,
          status: "SENT" as const,
          pdfMediaId: current.pdfMediaId,
          replayed: true,
        };
      }
      if (current.status !== "APPROVED" || !current.approvedById) {
        throw new QuoteError("Only an approved version can be sent.", 409);
      }
      if (current.expiresAt.getTime() <= Date.now()) {
        throw new QuoteError("Choose an expiry that is still ahead.", 400);
      }
      const approvers = await priorApproverIds(tx, current.id);
      if (senderIsApprover(userId, [...approvers, current.approvedById])) {
        throw new QuoteError("The approver cannot send this version.", 403);
      }
      assertTotals(current);
      const pdf = renderQuotePdf(documentText(toDocument(current)));
      const storageKey = `quotes/${current.id}.pdf`;
      await mediaStorage().put(storageKey, pdf);
      const media = await tx.mediaAsset.create({
        data: {
          storageKey,
          mimeType: "application/pdf",
          byteSize: pdf.byteLength,
          altText: `Quote ${current.quote.reference} version ${current.versionNo}`,
          kind: "DOCUMENT",
          status: "DRAFT",
          createdById: userId,
        },
        select: { id: true },
      });
      const sentAt = new Date();
      await tx.quoteVersion.update({
        where: { id: current.id },
        data: {
          status: "SENT",
          sentAt,
          pdfMediaId: media.id,
          revision: { increment: 1 },
        },
      });
      const previous = await tx.quoteVersion.findMany({
        where: { quoteId: current.quoteId, status: "SENT", id: { not: current.id } },
        select: { id: true },
      });
      for (const row of previous) {
        await tx.quoteVersion.updateMany({
          where: { id: row.id, status: "SENT" },
          data: { status: "SUPERSEDED", revision: { increment: 1 } },
        });
        await writeAudit(
          {
            actorId: userId,
            action: "quote.supersede",
            entityType: "quote_version",
            entityId: row.id,
            before: { status: "SENT" },
            after: { status: "SUPERSEDED" },
          },
          tx,
        );
      }
      const template = await tx.emailTemplate.findFirst({
        where: { code: "quote.sent", locale: "en" },
        select: { id: true },
      });
      await tx.emailDelivery.create({
        data: {
          templateId: template?.id,
          templateCode: "quote.sent",
          toEmail: current.quote.enquiry.customer.email,
          classification: "TRANSACTIONAL",
          idempotencyKey: `quote.sent:${current.id}`,
          status: "QUEUED",
          relatedType: "quote_version",
          relatedId: current.id,
        },
      });
      await tx.job.create({
        data: {
          type: "quote.send",
          idempotencyKey: `quote.send:${current.id}`,
          payload: { versionId: current.id },
        },
      });
      await tx.job.create({
        data: {
          type: "quote.expire",
          idempotencyKey: `quote.expire:${current.id}`,
          payload: { versionId: current.id },
          runAt: current.expiresAt,
        },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "quote.send",
          entityType: "quote_version",
          entityId: current.id,
          after: { status: "SENT", pdfMediaId: media.id },
        },
        tx,
      );
      return {
        versionId: current.id,
        status: "SENT" as const,
        pdfMediaId: media.id,
        replayed: false,
      };
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function createNextVersion(
  userId: string,
  quoteId: string,
): Promise<QuoteCommandResult> {
  const permissions = await permissionsForUser(userId);
  const quote = await accessQuote(userId, quoteId, permissions, true);
  try {
    return await db.$transaction(async (tx) => {
      if (!quote.activeVersionId) throw new QuoteError(unavailable, 404);
      await lockVersion(tx, quote.activeVersionId);
      const source = await tx.quoteVersion.findUnique({
        where: { id: quote.activeVersionId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          segments: { orderBy: { sortOrder: "asc" } },
        },
      });
      if (!source) throw new QuoteError(unavailable, 404);
      if (!openStatuses.has(source.status)) {
        throw new QuoteError(
          "Send, or return this version to draft, before starting another.",
          409,
        );
      }
      const last = await tx.quoteVersion.findFirst({
        where: { quoteId: quote.id },
        orderBy: { versionNo: "desc" },
        select: { versionNo: true },
      });
      const created = await tx.quoteVersion.create({
        data: {
          quoteId: quote.id,
          versionNo: (last?.versionNo ?? source.versionNo) + 1,
          currency: source.currency,
          subtotal: source.subtotal,
          taxTotal: source.taxTotal,
          feeTotal: source.feeTotal,
          discountTotal: source.discountTotal,
          grandTotal: source.grandTotal,
          termsSnapshot: source.termsSnapshot,
          welcomeMessage: source.welcomeMessage,
          overview: source.overview,
          expiresAt: source.expiresAt.getTime() > Date.now() ? source.expiresAt : defaultExpiry(),
          status: "DRAFT",
          createdById: userId,
        },
        select: { id: true },
      });
      if (source.segments.length > 0) {
        await tx.itinerarySegment.createMany({
          data: source.segments.map((segment) => ({
            quoteVersionId: created.id,
            sortOrder: segment.sortOrder,
            resortId: segment.resortId,
            roomTypeId: segment.roomTypeId,
            mealPlanId: segment.mealPlanId,
            startDate: segment.startDate,
            endDate: segment.endDate,
            transferSummary: segment.transferSummary,
            notes: segment.notes,
          })),
        });
      }
      if (source.items.length > 0) {
        await tx.quoteItem.createMany({
          data: source.items.map((item) => ({
            quoteVersionId: created.id,
            itemType: item.itemType,
            experienceId: item.experienceId,
            description: item.description,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            taxAmount: item.taxAmount,
            discountAmount: item.discountAmount,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
          })),
        });
      }
      await tx.quote.update({ where: { id: quote.id }, data: { activeVersionId: created.id } });
      await writeAudit(
        {
          actorId: userId,
          action: "quote.version",
          entityType: "quote",
          entityId: quote.id,
          after: { versionId: created.id, sourceVersionId: source.id },
        },
        tx,
      );
      return { quoteId: quote.id, versionId: created.id, reference: quote.reference };
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function respondToQuoteVersion(input: {
  customerId: string;
  actorId: string | null;
  versionId: string;
  responseType: string;
  message: string;
  idempotencyKey: string;
}): Promise<CustomerQuoteResponse> {
  if (!isUuid(input.versionId) || !isUuid(input.customerId)) throw new QuoteError(unavailable, 404);
  if (!isResponseType(input.responseType)) throw new QuoteError("Choose a response.", 400);
  const responseType = input.responseType;
  const keyError = idempotencyKeyError(input.idempotencyKey);
  if (keyError) throw new QuoteError(keyError, 400);
  const message = clip(input.message, 2000, "The message");
  if (input.responseType === "CLARIFICATION" && !message) {
    throw new QuoteError("Write the question you want the consultant to see.", 400);
  }
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        versionId: input.versionId,
        responseType: input.responseType,
        message,
      }),
    )
    .digest("hex");
  try {
    return await db.$transaction(async (tx) => {
      await lockVersion(tx, input.versionId);
      const stored = await tx.idempotencyKey.findUnique({ where: { key: input.idempotencyKey } });
      if (stored) {
        if (stored.requestHash !== hash) {
          throw new QuoteError("This submission key was already used.", 409);
        }
        const body = readStoredResponse(stored.responseBody);
        if (!body) throw new QuoteError("This submission key was already used.", 409);
        return body;
      }
      const current = await tx.quoteVersion.findUnique({
        where: { id: input.versionId },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          revision: true,
          quote: { select: { enquiry: { select: { customerId: true } } } },
        },
      });
      if (!current || current.quote.enquiry.customerId !== input.customerId) {
        throw new QuoteError(unavailable, 404);
      }
      const nowRows = await tx.$queryRaw<Array<{ now: Date }>>`SELECT now() AS now`;
      const now = nowRows[0]?.now ?? new Date();
      if (input.responseType === "CLARIFICATION") {
        if (current.status !== "SENT")
          throw new QuoteError("A clarification needs a sent quote.", 409);
      } else {
        const decision = acceptDecision(current.status, current.expiresAt, now);
        if (decision === "expired") throw new QuoteError("This quote has expired.", 409);
        if (decision === "state") throw new QuoteError("This quote cannot be accepted.", 409);
      }
      if (input.responseType === "ACCEPT" || input.responseType === "DECLINE") {
        const terminal = await tx.quoteResponse.findFirst({
          where: {
            quoteVersionId: current.id,
            responseType: { in: ["ACCEPT", "DECLINE"] },
          },
          select: { id: true },
        });
        if (terminal) throw new QuoteError("This quote already has a response.", 409);
      }
      const response = await tx.quoteResponse.create({
        data: {
          quoteVersionId: current.id,
          customerId: input.customerId,
          responseType,
          message: message || null,
        },
        select: { id: true },
      });
      let status = current.status;
      if (input.responseType === "ACCEPT" || input.responseType === "DECLINE") {
        status = input.responseType === "ACCEPT" ? "ACCEPTED" : "DECLINED";
        const updated = await tx.quoteVersion.updateMany({
          where: { id: current.id, status: "SENT", revision: current.revision },
          data: { status, revision: { increment: 1 } },
        });
        if (updated.count !== 1) throw new QuoteError("This quote cannot be accepted.", 409);
        await writeAudit(
          {
            actorId: input.actorId,
            action: "quote.status",
            entityType: "quote_version",
            entityId: current.id,
            before: { status: "SENT" },
            after: { status },
          },
          tx,
        );
      }
      await writeAudit(
        {
          actorId: input.actorId,
          action: "quote.response",
          entityType: "quote_version",
          entityId: current.id,
          after: { responseType: input.responseType, responseId: response.id },
        },
        tx,
      );
      const result: CustomerQuoteResponse = {
        versionId: current.id,
        status,
        responseType: input.responseType,
        responseId: response.id,
      };
      await tx.idempotencyKey.create({
        data: {
          key: input.idempotencyKey,
          requestHash: hash,
          responseCode: 200,
          responseBody: result,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return result;
    });
  } catch (error) {
    rethrowQuote(error);
  }
}

export async function expireDueQuotes(): Promise<number> {
  const due = await db.quoteVersion.findMany({
    where: { status: "SENT", expiresAt: { lte: new Date() } },
    select: { id: true },
  });
  let count = 0;
  for (const version of due) {
    const updated = await db.quoteVersion.updateMany({
      where: { id: version.id, status: "SENT", expiresAt: { lte: new Date() } },
      data: { status: "EXPIRED", revision: { increment: 1 } },
    });
    if (updated.count !== 1) continue;
    await writeAudit({
      action: "quote.expire",
      entityType: "quote_version",
      entityId: version.id,
      before: { status: "SENT" },
      after: { status: "EXPIRED" },
    });
    count += 1;
  }
  return count;
}

export async function readStaffQuotePdf(
  userId: string,
  versionId: string,
): Promise<{ filename: string; body: Uint8Array }> {
  if (!isUuid(versionId)) throw new QuoteError(unavailable, 404);
  const permissions = await permissionsForUser(userId);
  const version = await db.quoteVersion.findUnique({
    where: { id: versionId },
    select: {
      sentAt: true,
      pdfMediaId: true,
      quote: { select: { reference: true, enquiry: { select: { assignedUserId: true } } } },
    },
  });
  if (
    !version?.pdfMediaId ||
    !version.sentAt ||
    !canReadQuote(permissions, userId, version.quote.enquiry.assignedUserId)
  ) {
    throw new QuoteError(unavailable, 404);
  }
  return readPdf(version.pdfMediaId, version.quote.reference);
}

export async function readCustomerQuotePdf(
  customerId: string,
  versionId: string,
): Promise<{ filename: string; body: Uint8Array }> {
  if (!isUuid(versionId) || !isUuid(customerId)) throw new QuoteError(unavailable, 404);
  const version = await db.quoteVersion.findFirst({
    where: { id: versionId, quote: { enquiry: { customerId } } },
    select: {
      status: true,
      sentAt: true,
      pdfMediaId: true,
      quote: { select: { reference: true } },
    },
  });
  if (
    !version?.pdfMediaId ||
    !version.sentAt ||
    !isCustomerVisibleQuote(version.status, version.sentAt)
  ) {
    throw new QuoteError(unavailable, 404);
  }
  return readPdf(version.pdfMediaId, version.quote.reference);
}

async function readPdf(
  mediaId: string,
  reference: string,
): Promise<{ filename: string; body: Uint8Array }> {
  const asset = await db.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { storageKey: true },
  });
  const body = asset ? await mediaStorage().get(asset.storageKey) : null;
  if (!body) throw new QuoteError(unavailable, 404);
  return { filename: `${reference}.pdf`, body };
}

async function accessQuote(
  userId: string,
  quoteId: string,
  permissions: string[],
  write: boolean,
): Promise<{ id: string; reference: string; activeVersionId: string | null }> {
  if (!isUuid(quoteId)) throw new QuoteError(unavailable, 404);
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      reference: true,
      activeVersionId: true,
      enquiry: { select: { assignedUserId: true } },
    },
  });
  const allowed = quote
    ? write
      ? canWriteQuote(permissions, userId, quote.enquiry.assignedUserId)
      : canReadQuote(permissions, userId, quote.enquiry.assignedUserId)
    : false;
  if (!quote || !allowed) throw new QuoteError(unavailable, 404);
  return quote;
}

function assertTotals(
  version: VersionRecord & {
    items: Array<{
      itemType: string;
      quantity: { toString(): string };
      unitAmount: { toString(): string };
      taxAmount: { toString(): string };
      discountAmount: { toString(): string };
    }>;
  },
): void {
  const priced: PricedLine[] = [];
  for (const item of version.items) {
    if (!isItemType(item.itemType)) throw new QuoteError("The totals do not match the lines.", 409);
    const quantity = quantityFromDecimal(item.quantity);
    const unitCents = parseMoney(item.unitAmount.toString());
    const taxCents = parseMoney(item.taxAmount.toString());
    const discountCents = parseMoney(item.discountAmount.toString());
    if (quantity === null || unitCents === null || taxCents === null || discountCents === null) {
      throw new QuoteError("The totals do not match the lines.", 409);
    }
    const line = priceLine({
      itemType: item.itemType,
      quantity,
      unitCents,
      taxCents,
      discountCents,
    });
    if (!line) throw new QuoteError("The totals do not match the lines.", 409);
    priced.push(line);
  }
  const expected = headerFromLines(priced);
  const actual = totalsOf(version);
  if (
    !expected ||
    expected.subtotalCents !== actual.subtotalCents ||
    expected.taxCents !== actual.taxCents ||
    expected.feeCents !== actual.feeCents ||
    expected.discountCents !== actual.discountCents ||
    expected.grandCents !== actual.grandCents
  ) {
    throw new QuoteError("The totals do not match the lines.", 409);
  }
}

function toDocument(version: {
  versionNo: number;
  currency: string;
  welcomeMessage: string | null;
  overview: string | null;
  termsSnapshot: string;
  expiresAt: Date;
  subtotal: { toString(): string };
  taxTotal: { toString(): string };
  feeTotal: { toString(): string };
  discountTotal: { toString(): string };
  grandTotal: { toString(): string };
  quote: { reference: string };
  items: Array<{ itemType: string; description: string; lineTotal: { toString(): string } }>;
  segments: Array<{
    startDate: Date;
    endDate: Date;
    transferSummary: string | null;
    notes: string | null;
    resort: { name: string; status: string } | null;
    roomType: { name: string } | null;
    mealPlan: { label: string } | null;
  }>;
}): QuoteDocument {
  const unpublished = "This listing is not currently published.";
  const segments = version.segments.map((segment) => {
    const published = segment.resort?.status === "PUBLISHED";
    return {
      dates: `${dateOnly(segment.startDate)} to ${dateOnly(segment.endDate)}`,
      resort: segment.resort ? (published ? segment.resort.name : unpublished) : "Not added",
      room: published ? (segment.roomType?.name ?? null) : null,
      meal: segment.mealPlan?.label ?? null,
      transfer: segment.transferSummary,
      notes: segment.notes,
    };
  });
  return {
    reference: version.quote.reference,
    versionNo: version.versionNo,
    currency: version.currency,
    welcome: version.welcomeMessage?.trim() || `Quote ${version.quote.reference}`,
    overview: version.overview ?? "",
    segments,
    transfers: [
      ...segments.flatMap((segment) => (segment.transfer ? [segment.transfer] : [])),
      ...version.items.flatMap((item) => (item.itemType === "TRANSFER" ? [item.description] : [])),
    ],
    activities: version.items.flatMap((item) =>
      item.itemType === "EXPERIENCE" ? [item.description] : [],
    ),
    lines: version.items.map((item) => ({
      description: item.description,
      amount: money(version.currency, item.lineTotal),
    })),
    subtotal: money(version.currency, version.subtotal),
    taxTotal: money(version.currency, version.taxTotal),
    feeTotal: money(version.currency, version.feeTotal),
    discountTotal: money(version.currency, version.discountTotal),
    grandTotal: money(version.currency, version.grandTotal),
    terms: version.termsSnapshot,
    expiresOn: dateOnly(version.expiresAt),
  };
}

function readStoredResponse(body: Prisma.JsonValue): CustomerQuoteResponse | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const versionId = "versionId" in body && typeof body.versionId === "string" ? body.versionId : "";
  const status = "status" in body && typeof body.status === "string" ? body.status : "";
  const responseType =
    "responseType" in body && typeof body.responseType === "string" ? body.responseType : "";
  const responseId =
    "responseId" in body && typeof body.responseId === "string" ? body.responseId : "";
  if (!versionId || !status || !responseType || !responseId) return null;
  return { versionId, status, responseType, responseId };
}
