import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/modules/audit/service";
import { canReadOwnCustomer } from "@/modules/customers/policies";
import { publishedPublic } from "@/modules/discovery/visibility";
import {
  enquiryStatusLabel,
  formatAmount,
  isCustomerVisibleQuote,
  messageBodyError,
  quoteStatusLabel,
} from "@/modules/customers/rules";
import { openAccount, PortalError } from "@/modules/customers/service";
import { partySupplied } from "@/modules/enquiries/party";

const unavailable = "That record is not available.";
const unpublished = "This listing is not currently published.";

const messageHits = new Map<string, number[]>();

export type EnquirySummary = {
  reference: string;
  statusLabel: string;
  travelStart: string | null;
  travelEnd: string | null;
  createdAt: string;
};

export type QuoteSummary = {
  id: string;
  reference: string;
  versionNo: number;
  statusLabel: string;
};

export type EnquiryDetail = EnquirySummary & {
  flexibility: string | null;
  adultCount: number;
  /** False when adultCount is a system placeholder, not a party size the customer gave. */
  partySupplied: boolean;
  childAges: number[];
  budget: string | null;
  tripType: string | null;
  requirements: string | null;
  accessibilityNeeds: string | null;
  resorts: Array<{ name: string; href: string | null }>;
  offers: Array<{ name: string }>;
  interests: Array<{ name: string; href: string | null }>;
  quotes: QuoteSummary[];
};

export type ThreadEntry = {
  id: string;
  from: "You" | "Consultant";
  body: string;
  createdAt: string;
};

export type MessageThread = {
  reference: string;
  entries: ThreadEntry[];
};

export type OwnQuote = {
  id: string;
  reference: string;
  versionNo: number;
  statusLabel: string;
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
  enquiryReference: string;
  canAccept: boolean;
  canClarify: boolean;
  pdfAvailable: boolean;
  responses: Array<{ label: string; message: string | null; createdAt: string }>;
};

export async function listOwnEnquiries(userId: string): Promise<EnquirySummary[]> {
  const customer = await openAccount(userId);
  const rows = await db.enquiry.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: {
      reference: true,
      status: true,
      travelStart: true,
      travelEnd: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    reference: row.reference,
    statusLabel: enquiryStatusLabel(row.status),
    travelStart: dateOnly(row.travelStart),
    travelEnd: dateOnly(row.travelEnd),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function readOwnEnquiry(
  userId: string,
  reference: string,
): Promise<EnquiryDetail | null> {
  const customer = await openAccount(userId);
  const row = await db.enquiry.findFirst({
    where: { reference, customerId: customer.id },
    include: {
      travelers: { orderBy: { sortOrder: "asc" } },
      resorts: true,
      offers: true,
      interests: true,
      tripType: { select: { label: true } },
      quotes: {
        include: {
          versions: {
            select: { id: true, versionNo: true, status: true, sentAt: true },
            orderBy: { versionNo: "desc" },
          },
        },
      },
    },
  });
  if (!row || !canReadOwnCustomer(userId, customer.userId)) return null;
  const [resorts, offers, interests] = await Promise.all([
    publishedNames(
      "resort",
      row.resorts.map((item) => item.resortId),
    ),
    publishedNames(
      "offer",
      row.offers.map((item) => item.offerId),
    ),
    publishedNames(
      "experience",
      row.interests.map((item) => item.experienceId),
    ),
  ]);
  const quotes = row.quotes.flatMap((quote) => {
    const visible = quote.versions.find((version) =>
      isCustomerVisibleQuote(version.status, version.sentAt),
    );
    if (!visible) return [];
    return [
      {
        id: visible.id,
        reference: quote.reference,
        versionNo: visible.versionNo,
        statusLabel: quoteStatusLabel(visible.status),
      },
    ];
  });
  return {
    reference: row.reference,
    statusLabel: enquiryStatusLabel(row.status),
    travelStart: dateOnly(row.travelStart),
    travelEnd: dateOnly(row.travelEnd),
    createdAt: row.createdAt.toISOString(),
    flexibility: row.flexibility,
    adultCount: row.adultCount,
    partySupplied: partySupplied(row.submittedSnapshot),
    childAges: row.travelers.flatMap((traveler) =>
      traveler.travelerType === "ADULT" || traveler.ageAtArrival === null
        ? []
        : [traveler.ageAtArrival],
    ),
    budget: budgetText(row.budgetMin, row.budgetMax, row.budgetCurrency),
    tripType: row.tripType?.label ?? null,
    requirements: row.requirements,
    accessibilityNeeds: row.accessibilityNeeds,
    resorts,
    offers: offers.map((item) => ({ name: item.name })),
    interests,
    quotes,
  };
}

export async function listMessageThreads(
  userId: string,
): Promise<Array<{ reference: string; preview: string }>> {
  const enquiries = await listOwnEnquiries(userId);
  const threads = await Promise.all(
    enquiries.map(async (enquiry) => {
      const thread = await readOwnThread(userId, enquiry.reference);
      const latest = thread?.entries.at(-1);
      return {
        reference: enquiry.reference,
        preview: latest ? latest.body.slice(0, 120) : "No message on this plan.",
      };
    }),
  );
  return threads;
}

export async function readOwnThread(
  userId: string,
  reference: string,
): Promise<MessageThread | null> {
  const customer = await openAccount(userId);
  const enquiry = await db.enquiry.findFirst({
    where: { reference, customerId: customer.id },
    select: { id: true, reference: true },
  });
  if (!enquiry) return null;
  const [messages, notes] = await Promise.all([
    db.message.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderType: true,
        customerSenderId: true,
        body: true,
        createdAt: true,
      },
    }),
    db.note.findMany({
      where: { enquiryId: enquiry.id, visibility: "CUSTOMER" },
      orderBy: { createdAt: "asc" },
      select: { id: true, body: true, createdAt: true },
    }),
  ]);
  const entries: ThreadEntry[] = [
    ...messages.map((message) => ({
      id: message.id,
      from:
        message.senderType === "CUSTOMER" && message.customerSenderId === customer.id
          ? ("You" as const)
          : ("Consultant" as const),
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
    ...notes.map((note) => ({
      id: note.id,
      from: "Consultant" as const,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    })),
  ].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  return { reference: enquiry.reference, entries };
}

export async function postOwnMessage(
  userId: string,
  reference: string,
  body: string,
): Promise<void> {
  const problem = messageBodyError(body);
  if (problem) throw new PortalError(problem, 400);
  const customer = await openAccount(userId);
  if (messageLimited(customer.id)) throw new PortalError("Try again later.", 429);
  const enquiry = await db.enquiry.findFirst({
    where: { reference, customerId: customer.id },
    select: { id: true, customerId: true },
  });
  if (!enquiry || enquiry.customerId !== customer.id) throw new PortalError(unavailable, 404);
  try {
    await db.$transaction(async (tx) => {
      const owned = await tx.enquiry.findFirst({
        where: { id: enquiry.id, customerId: customer.id },
        select: { id: true },
      });
      if (!owned) throw new PortalError(unavailable, 404);
      const message = await tx.message.create({
        data: {
          enquiryId: owned.id,
          senderType: "CUSTOMER",
          customerSenderId: customer.id,
          body: body.trim(),
        },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "message.create",
          entityType: "message",
          entityId: message.id,
          after: { enquiryId: owned.id },
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof PortalError) throw error;
    const text = error instanceof Error ? error.message : "";
    if (text.includes("customer message must belong")) throw new PortalError(unavailable, 404);
    throw error;
  }
}

export async function readOwnQuote(
  userId: string,
  quoteVersionId: string,
): Promise<OwnQuote | null> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      quoteVersionId,
    )
  ) {
    return null;
  }
  const customer = await openAccount(userId);
  const version = await db.quoteVersion.findFirst({
    where: {
      id: quoteVersionId,
      sentAt: { not: null },
      status: { in: ["SENT", "ACCEPTED", "DECLINED", "EXPIRED", "SUPERSEDED", "WITHDRAWN"] },
      quote: { enquiry: { customerId: customer.id } },
    },
    include: {
      quote: {
        select: { reference: true, enquiry: { select: { reference: true, customerId: true } } },
      },
      items: { orderBy: { sortOrder: "asc" } },
      segments: {
        orderBy: { sortOrder: "asc" },
        include: {
          resort: { select: { name: true, status: true } },
          roomType: { select: { name: true } },
          mealPlan: { select: { label: true } },
        },
      },
      responses: {
        orderBy: { createdAt: "asc" },
        select: { responseType: true, message: true, createdAt: true },
      },
    },
  });
  if (!version || version.quote.enquiry.customerId !== customer.id) return null;
  if (!isCustomerVisibleQuote(version.status, version.sentAt)) return null;
  const segments = version.segments.map((segment) => {
    const published = segment.resort?.status === "PUBLISHED";
    return {
      dates: `${dateOnly(segment.startDate) ?? ""} to ${dateOnly(segment.endDate) ?? ""}`,
      resort: segment.resort ? (published ? segment.resort.name : unpublished) : "Not added",
      room: published ? (segment.roomType?.name ?? null) : null,
      meal: segment.mealPlan?.label ?? null,
      transfer: segment.transferSummary,
      notes: segment.notes,
    };
  });
  return {
    id: version.id,
    reference: version.quote.reference,
    versionNo: version.versionNo,
    statusLabel: quoteStatusLabel(version.status),
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
      amount: `${version.currency} ${formatAmount(item.lineTotal)}`,
    })),
    subtotal: money(version.currency, version.subtotal),
    taxTotal: money(version.currency, version.taxTotal),
    feeTotal: money(version.currency, version.feeTotal),
    discountTotal: money(version.currency, version.discountTotal),
    grandTotal: money(version.currency, version.grandTotal),
    terms: version.termsSnapshot,
    expiresOn: version.expiresAt.toISOString().slice(0, 10),
    enquiryReference: version.quote.enquiry.reference,
    canAccept: version.status === "SENT" && version.expiresAt.getTime() > Date.now(),
    canClarify: version.status === "SENT",
    pdfAvailable: version.pdfMediaId !== null,
    responses: version.responses.map((response) => ({
      label:
        response.responseType === "ACCEPT"
          ? "Accepted"
          : response.responseType === "DECLINE"
            ? "Declined"
            : "Clarification",
      message: response.message,
      createdAt: response.createdAt.toISOString(),
    })),
  };
}

function money(currency: string, value: Prisma.Decimal): string {
  return `${currency} ${formatAmount(value)}`;
}

function dateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function budgetText(
  min: Prisma.Decimal | null,
  max: Prisma.Decimal | null,
  currency: string | null,
): string | null {
  if (!min || !max || !currency) return null;
  return `${currency} ${formatAmount(min)} to ${formatAmount(max)}`;
}

async function publishedNames(
  kind: "resort" | "offer" | "experience",
  ids: string[],
): Promise<Array<{ name: string; href: string | null }>> {
  if (ids.length === 0) return [];
  if (kind === "resort") {
    const rows = await db.resort.findMany({
      where: { id: { in: ids }, ...publishedPublic() },
      select: { id: true, name: true, slug: true },
    });
    const found = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => {
      const row = found.get(id);
      return row
        ? { name: row.name, href: `/resorts/${row.slug}` }
        : { name: unpublished, href: null };
    });
  }
  if (kind === "experience") {
    const rows = await db.experience.findMany({
      where: { id: { in: ids }, ...publishedPublic() },
      select: { id: true, name: true, slug: true },
    });
    const found = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => {
      const row = found.get(id);
      return row
        ? { name: row.name, href: `/experiences/${row.slug}` }
        : { name: unpublished, href: null };
    });
  }
  const rows = await db.offer.findMany({
    where: { id: { in: ids }, ...publishedPublic() },
    select: { id: true, title: true },
  });
  const found = new Map(rows.map((row) => [row.id, row.title]));
  return ids.map((id) => ({ name: found.get(id) ?? unpublished, href: null }));
}

function messageLimited(customerId: string): boolean {
  const now = Date.now();
  const recent = (messageHits.get(customerId) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  recent.push(now);
  messageHits.set(customerId, recent);
  return recent.length > 20;
}
