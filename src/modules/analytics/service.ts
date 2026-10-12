import { cookies, headers } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { permissionsForUser } from "@/modules/identity/service";
import {
  acceptanceRate,
  consentedViewShare,
  isProductEvent,
  plannerCompletion,
  responseRate,
  safeProperties,
  sendRate,
  type ProductEventName,
} from "@/modules/analytics/rules";
import { consentFromCookie, type SearchConsent } from "@/modules/search/query";

export const moduleStatus = "implemented" as const;

const unavailable = "That record is not available.";

export class AnalyticsError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AnalyticsError";
    this.status = status;
  }
}

function uuidOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export async function recordProductEvent(input: {
  name: string;
  consent: SearchConsent;
  anonymousKey?: string | null;
  userId?: string | null;
  properties?: Record<string, unknown>;
}): Promise<boolean> {
  if (!isProductEvent(input.name)) return false;
  const granted = input.consent === "GRANTED";
  if (!granted && input.name !== "entity_viewed") return false;
  const properties = safeProperties(input.properties ?? {}, granted);
  await db.analyticsEvent.create({
    data: {
      eventName: input.name,
      anonymousKey: granted ? uuidOrNull(input.anonymousKey) : null,
      userId: granted ? uuidOrNull(input.userId) : null,
      properties,
      consentState: input.consent,
    },
  });
  return true;
}

export async function noteConsentEvent(
  name: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const jar = await cookies();
    const session = await auth().catch(() => null);
    await recordProductEvent({
      name,
      consent: consentFromCookie(jar.get("me_analytics")?.value),
      anonymousKey: jar.get("me_anon")?.value,
      userId: session?.user?.id,
      properties,
    });
  } catch {
    return;
  }
}
  try {
    const store = await headers();
    const jar = await cookies();
    const session = await auth().catch(() => null);
    const consent = consentFromCookie(jar.get("me_analytics")?.value);
    const cleanPath = path.split("?")[0] ?? path;
    await recordProductEvent({
      name: "entity_viewed",
      consent,
      anonymousKey: jar.get("me_anon")?.value,
      userId: session?.user?.id,
      properties: { kind, path: cleanPath },
    });
    const referer = store.get("referer") ?? "";
    if (referer.includes("/search")) {
      await recordProductEvent({
        name: "search_result_selected",
        consent,
        anonymousKey: jar.get("me_anon")?.value,
        userId: session?.user?.id,
        properties: { kind, path: cleanPath },
      });
    }
  } catch {
    return;
  }
}

async function requireReport(userId: string): Promise<void> {
  const permissions = await permissionsForUser(userId);
  if (!permissions.includes("report.read")) throw new AnalyticsError(unavailable, 404);
}

export type OperationalReport = {
  response: string;
  responseFormula: string;
  send: string;
  sendFormula: string;
  acceptance: string;
  acceptanceFormula: string;
  quotes: Array<{ label: string; count: number }>;
  guides: number;
  staleGuides: number;
  staleFormula: string;
  subscribers: Array<{ label: string; count: number }>;
  subscriberFormula: string;
  failedJobs: number;
  failedFormula: string;
};

const versionLabels: Record<string, string> = {
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

export async function operationalReport(userId: string): Promise<OperationalReport> {
  await requireReport(userId);
  const [received, answered, quoteCount, versions, guides, staleGuides, subscriptions, failedJobs] =
    await Promise.all([
      db.enquiry.count(),
      db.enquiry.count({ where: { firstResponseAt: { not: null } } }),
      db.quote.count(),
      db.quoteVersion.groupBy({ by: ["status"], _count: { _all: true } }),
      db.article.count({ where: { status: "PUBLISHED" } }),
      db.article.count({ where: { status: "PUBLISHED", staleAfter: { lt: new Date() } } }),
      db.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      db.job.count({ where: { status: "FAILED" } }),
    ]);
  const [sentQuotes, acceptedQuotes] = await Promise.all([
    db.quote.count({ where: { versions: { some: { sentAt: { not: null } } } } }),
    db.quote.count({ where: { versions: { some: { status: "ACCEPTED" } } } }),
  ]);
  return {
    response: responseRate(answered, received),
    responseFormula: "Response rate = enquiries with a first response ÷ enquiries received.",
    send: sendRate(sentQuotes, quoteCount),
    sendFormula: "Send rate = quotes with a sent version ÷ quotes.",
    acceptance: acceptanceRate(acceptedQuotes, sentQuotes),
    acceptanceFormula: "Acceptance rate = quotes with an accepted version ÷ quotes with a sent version.",
    quotes: versions.map((row) => ({
      label: versionLabels[row.status] ?? row.status,
      count: row._count._all,
    })),
    guides,
    staleGuides,
    staleFormula: "Stale guides = published guides whose review date is before now.",
    subscribers: subscriptions.map((row) => ({ label: row.status, count: row._count._all })),
    subscriberFormula: "Confirmed subscribers = subscriptions whose status is confirmed.",
    failedJobs,
    failedFormula: "Failed jobs = jobs whose status is failed.",
  };
}

export type AnalyticsReport = {
  viewShare: string;
  viewFormula: string;
  searchDemand: number;
  searchFormula: string;
  emptySearches: number;
  emptyFormula: string;
  queries: string[];
  shortlist: number;
  shortlistFormula: string;
  planner: string;
  plannerFormula: string;
  quotesViewed: number;
  quoteFormula: string;
  content: Array<{ kind: string; count: number }>;
  contentFormula: string;
};

export async function analyticsReport(userId: string): Promise<AnalyticsReport> {
  await requireReport(userId);
  const [grantedEvents, views, searches, plannerEvents, contentEvents] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ["eventName"],
      where: { consentState: "GRANTED" },
      _count: { _all: true },
    }),
    db.analyticsEvent.groupBy({
      by: ["consentState"],
      where: { eventName: "entity_viewed" },
      _count: { _all: true },
    }),
    db.analyticsEvent.findMany({
      where: { eventName: "search_submitted", consentState: "GRANTED" },
      select: { properties: true },
      orderBy: { occurredAt: "desc" },
      take: 500,
    }),
    db.analyticsEvent.findMany({
      where: {
        consentState: "GRANTED",
        eventName: { in: ["planner_started", "planner_step_completed"] },
      },
      select: { eventName: true, properties: true },
      take: 500,
    }),
    db.analyticsEvent.findMany({
      where: { eventName: "entity_viewed", consentState: "GRANTED" },
      select: { properties: true },
      take: 500,
    }),
  ]);
  const count = (name: ProductEventName) =>
    grantedEvents.find((row) => row.eventName === name)?._count._all ?? 0;
  const grantedViews = views.find((row) => row.consentState === "GRANTED")?._count._all ?? 0;
  const totalViews = views.reduce((sum, row) => sum + row._count._all, 0);
  const queryCounts = new Map<string, number>();
  let emptySearches = 0;
  for (const row of searches) {
    const properties = row.properties;
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) continue;
    const resultCount = "resultCount" in properties ? Number(properties.resultCount) : 1;
    if (resultCount === 0) emptySearches += 1;
    const query = "query" in properties && typeof properties.query === "string" ? properties.query : "";
    if (!query || query.includes("@")) continue;
    queryCounts.set(query, (queryCounts.get(query) ?? 0) + 1);
  }
  const started = plannerEvents.filter((row) => row.eventName === "planner_started").length;
  const completed = plannerEvents.filter((row) => {
    if (row.eventName !== "planner_step_completed") return false;
    const properties = row.properties;
    return (
      properties &&
      typeof properties === "object" &&
      !Array.isArray(properties) &&
      "step" in properties &&
      properties.step === "review"
    );
  }).length;
  const kinds = new Map<string, number>();
  for (const row of contentEvents) {
    const properties = row.properties;
    const kind =
      properties &&
      typeof properties === "object" &&
      !Array.isArray(properties) &&
      "kind" in properties &&
      typeof properties.kind === "string"
        ? properties.kind
        : "other";
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  }
  return {
    viewShare: consentedViewShare(grantedViews, totalViews),
    viewFormula:
      "Consented view share = entity views with analytics consent granted ÷ all stored entity views.",
    searchDemand: count("search_submitted"),
    searchFormula: "Search demand = consented search_submitted events.",
    emptySearches,
    emptyFormula: "Empty searches = consented searches whose published result count is 0.",
    queries: [...queryCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([query, total]) => `${query} (${total})`),
    shortlist: count("saved_item_added"),
    shortlistFormula: "Shortlist use = consented saved_item_added events.",
    planner: plannerCompletion(completed, started),
    plannerFormula:
      "Planner completion = consented review steps ÷ consented planner starts.",
    quotesViewed: count("quote_viewed"),
    quoteFormula: "Quote interest = consented quote_viewed events.",
    content: [...kinds.entries()].map(([kind, total]) => ({ kind, count: total })),
    contentFormula: "Content performance = consented entity views grouped by kind.",
  };
}
