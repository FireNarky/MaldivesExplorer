import { cookies, headers } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { permissionsForUser } from "@/modules/identity/service";
import {
  acceptanceRate,
  consentedViewShare,
  isProductEvent,
  metricFormulas,
  plannerCompletion,
  responseRate,
  safeProperties,
  sendRate,
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

export async function notePublicView(kind: string, path: string): Promise<void> {
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
  response: string | null;
  responseFormula: string;
  send: string | null;
  sendFormula: string;
  acceptance: string | null;
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
    responseFormula: metricFormulas.responseRate,
    send: sendRate(sentQuotes, quoteCount),
    sendFormula: metricFormulas.sendRate,
    acceptance: acceptanceRate(acceptedQuotes, sentQuotes),
    acceptanceFormula: metricFormulas.acceptanceRate,
    quotes: versions.map((row) => ({
      label: versionLabels[row.status] ?? row.status,
      count: row._count._all,
    })),
    guides,
    staleGuides,
    staleFormula: metricFormulas.staleGuides,
    subscribers: subscriptions.map((row) => ({ label: row.status, count: row._count._all })),
    subscriberFormula: metricFormulas.confirmedSubscribers,
    failedJobs,
    failedFormula: metricFormulas.failedJobs,
  };
}

export type AnalyticsReport = {
  viewShare: string | null;
  viewFormula: string;
  searchDemand: number;
  searchFormula: string;
  emptySearches: number;
  emptyFormula: string;
  shortlist: number;
  shortlistFormula: string;
  planner: string | null;
  plannerFormula: string;
  content: Array<{ kind: string; count: number }>;
  contentFormula: string;
};

export async function analyticsReport(userId: string): Promise<AnalyticsReport> {
  await requireReport(userId);
  const [
    grantedViews,
    totalViews,
    searchDemand,
    emptySearches,
    shortlist,
    started,
    completed,
    content,
  ] = await Promise.all([
    db.analyticsEvent.count({ where: { eventName: "entity_viewed", consentState: "GRANTED" } }),
    db.analyticsEvent.count({ where: { eventName: "entity_viewed" } }),
    db.analyticsEvent.count({ where: { eventName: "search_submitted", consentState: "GRANTED" } }),
    db.analyticsEvent.count({
      where: {
        eventName: "search_submitted",
        consentState: "GRANTED",
        properties: { path: ["resultCount"], equals: 0 },
      },
    }),
    db.analyticsEvent.count({ where: { eventName: "saved_item_added", consentState: "GRANTED" } }),
    db.analyticsEvent.count({ where: { eventName: "planner_started", consentState: "GRANTED" } }),
    db.analyticsEvent.count({
      where: {
        eventName: "planner_step_completed",
        consentState: "GRANTED",
        properties: { path: ["step"], equals: "review" },
      },
    }),
    db.$queryRaw<Array<{ kind: string; count: number }>>`
        SELECT properties->>'kind' AS kind, count(*)::int AS count
        FROM analytics_events
        WHERE event_name = 'entity_viewed'
          AND consent_state = 'GRANTED'
          AND jsonb_typeof(properties->'kind') = 'string'
        GROUP BY 1
        ORDER BY 2 DESC
      `,
  ]);
  return {
    viewShare: consentedViewShare(grantedViews, totalViews),
    viewFormula: metricFormulas.viewShare,
    searchDemand,
    searchFormula: metricFormulas.searchDemand,
    emptySearches,
    emptyFormula: metricFormulas.emptySearches,
    shortlist,
    shortlistFormula: metricFormulas.shortlistUse,
    planner: plannerCompletion(completed, started),
    plannerFormula: metricFormulas.plannerCompletion,
    content,
    contentFormula: metricFormulas.contentPerformance,
  };
}
