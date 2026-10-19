export const productEvents = [
  "search_submitted",
  "search_result_selected",
  "filter_applied",
  "entity_viewed",
  "saved_item_added",
  "comparison_started",
  "planner_started",
  "planner_step_completed",
  "enquiry_submitted",
  "quote_viewed",
  "quote_response",
  "newsletter_subscribed",
  "outbound_contact_clicked",
] as const;

export type ProductEventName = (typeof productEvents)[number];

const eventSet = new Set<string>(productEvents);

export function isProductEvent(value: string): value is ProductEventName {
  return eventSet.has(value);
}

export function safeProperties(
  input: Record<string, unknown>,
  granted: boolean,
): Record<string, string | number | boolean> {
  const next: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (/email|phone|name/i.test(key)) continue;
    if (typeof value === "string") {
      if (value.includes("@") || value.length > 200) continue;
      next[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      next[key] = value;
    } else if (typeof value === "boolean") {
      next[key] = value;
    }
  }
  if (!granted) {
    const kind = next.kind;
    return typeof kind === "string" ? { kind } : {};
  }
  return next;
}

export const metricFormulas = {
  responseRate: "Response rate = enquiries with a first response ÷ enquiries received.",
  sendRate: "Send rate = quotes with a sent version ÷ quotes.",
  acceptanceRate: "Acceptance rate = quotes with an accepted version ÷ quotes with a sent version.",
  staleGuides: "Stale guides = published guides whose review date is before now.",
  confirmedSubscribers: "Confirmed subscribers = subscriptions whose status is confirmed.",
  failedJobs: "Failed jobs = jobs whose status is failed.",
  viewShare:
    "Consented view share = entity views with analytics consent granted ÷ all stored entity views.",
  searchDemand: "Search demand = consented search_submitted events.",
  emptySearches:
    "Empty searches = consented searches that store a result count of 0. A search without a result count is omitted.",
  shortlistUse: "Shortlist use = consented saved_item_added events.",
  plannerCompletion: "Planner completion = consented review steps ÷ consented planner starts.",
  contentPerformance:
    "Content performance = consented entity views that store a kind, grouped by that kind.",
} as const;

export function ratioLabel(
  part: number | null,
  whole: number | null,
  empty: string,
): string | null {
  if (part === null || whole === null) return null;
  if (whole <= 0) return empty;
  return `${part} of ${whole}`;
}

export function emptySearchCount(
  events: ReadonlyArray<{ resultCount: number | null }>,
): number | null {
  if (events.length === 0) return 0;
  const measured = events.filter((event) => event.resultCount !== null);
  if (measured.length === 0) return null;
  return measured.filter((event) => event.resultCount === 0).length;
}

export function consentedViewShare(granted: number, total: number): string | null {
  return ratioLabel(granted, total, "No entity views are stored.");
}

export function responseRate(answered: number, received: number): string | null {
  return ratioLabel(answered, received, "No enquiries are stored.");
}

export function sendRate(sent: number, quotes: number): string | null {
  return ratioLabel(sent, quotes, "No quotes are stored.");
}

export function acceptanceRate(accepted: number, sent: number): string | null {
  return ratioLabel(accepted, sent, "No sent quotes are stored.");
}

export function plannerCompletion(completed: number, started: number): string | null {
  return ratioLabel(completed, started, "No consented planner starts are stored.");
}
