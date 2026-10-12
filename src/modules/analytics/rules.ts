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

export function ratioLabel(part: number, whole: number, empty: string): string {
  if (whole <= 0) return empty;
  return `${part} of ${whole}`;
}

export function consentedViewShare(granted: number, total: number): string {
  return ratioLabel(granted, total, "No entity views are stored.");
}

export function responseRate(answered: number, received: number): string {
  return ratioLabel(answered, received, "No enquiries are stored.");
}

export function sendRate(sent: number, quotes: number): string {
  return ratioLabel(sent, quotes, "No quotes are stored.");
}

export function acceptanceRate(accepted: number, sent: number): string {
  return ratioLabel(accepted, sent, "No sent quotes are stored.");
}

export function plannerCompletion(completed: number, started: number): string {
  return ratioLabel(completed, started, "No consented planner starts are stored.");
}
