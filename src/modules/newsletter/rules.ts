import { createHmac, timingSafeEqual } from "node:crypto";

export const newsletterTopics = ["guides", "resorts", "planning"] as const;
export type NewsletterTopic = (typeof newsletterTopics)[number];

export const subscriptionStatuses = ["PENDING", "CONFIRMED", "UNSUBSCRIBED", "SUPPRESSED"] as const;
export type SubscriptionStatusName = (typeof subscriptionStatuses)[number];

const topicSet = new Set<string>(newsletterTopics);

export function emailError(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 200) return "Enter an email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter an email address.";
  return null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function selectedTopics(values: readonly string[]): NewsletterTopic[] {
  const chosen: NewsletterTopic[] = [];
  for (const value of values) {
    if (!topicSet.has(value)) continue;
    if (!chosen.includes(value as NewsletterTopic)) chosen.push(value as NewsletterTopic);
  }
  return chosen;
}

export function topicsFromPreferences(value: unknown): NewsletterTopic[] {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("topics" in value)) {
    return [];
  }
  const topics = value.topics;
  if (!Array.isArray(topics)) return [];
  return selectedTopics(topics.filter((item): item is string => typeof item === "string"));
}

export function topicLabel(topic: NewsletterTopic): string {
  if (topic === "guides") return "Guides";
  if (topic === "resorts") return "Resorts";
  return "Planning notes";
}

export function subscribeDecision(input: {
  doubleOptIn: boolean;
  existing: SubscriptionStatusName | null;
  explicitMarketingConsent: boolean;
}): "blocked" | "pending" | "confirmed" | "preferences" {
  if (!input.explicitMarketingConsent) return "blocked";
  if (input.existing === "SUPPRESSED") return "blocked";
  if (input.existing === "CONFIRMED") return "preferences";
  if (input.existing === "PENDING") return "pending";
  if (input.doubleOptIn) return "pending";
  return "confirmed";
}

export function idempotencyKeyError(value: string): string | null {
  return /^[A-Za-z0-9_-]{8,80}$/.test(value) ? null : "The submission key is not valid.";
}

export function signSubscription(id: string, secret: string): string {
  if (secret.length < 32) throw new Error("AUTH_SECRET is required.");
  const mac = createHmac("sha256", secret).update(id).digest("base64url");
  return `${id}.${mac}`;
}

export function readSubscriptionToken(token: string, secret: string): string | null {
  if (secret.length < 32) return null;
  const split = token.split(".");
  const id = split[0];
  const mac = split[1];
  if (!id || !mac || split.length !== 2) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const expected = createHmac("sha256", secret).update(id).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return id;
}

export function statusLabel(status: SubscriptionStatusName): string {
  if (status === "PENDING") return "Confirmation queued";
  if (status === "CONFIRMED") return "Subscribed";
  if (status === "UNSUBSCRIBED") return "Unsubscribed";
  return "Suppressed";
}

export async function newsletterLimited(key: string): Promise<boolean> {
  const { rateLimiter } = await import("@/lib/rate-limit/limiter");
  const allowed = await rateLimiter().consume(`newsletter:${key}`, 20, 60 * 60 * 1000);
  return !allowed;
}
