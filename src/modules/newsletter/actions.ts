"use server";

import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isNextRedirect } from "@/lib/http/navigation";
import { recordProductEvent } from "@/modules/analytics/service";
import { readProfile } from "@/modules/customers/service";
import { newsletterLimited } from "@/modules/newsletter/rules";
import { consentFromCookie } from "@/modules/search/query";
import {
  NewsletterError,
  currentNoticeVersion,
  importSubscriptions,
  readSubscriptionByEmail,
  subscribeNewsletter,
  subscriptionIdFromToken,
  suppressSubscription,
  unsubscribeNewsletter,
  updateNewsletterPreferences,
} from "@/modules/newsletter/service";

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function fail(path: string, error: unknown): never {
  if (isNextRedirect(error)) throw error;
  const message =
    error instanceof NewsletterError ? error.message : "The subscription could not be saved.";
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}error=${encodeURIComponent(message)}`);
}

async function ipHash(): Promise<string> {
  const store = await headers();
  const ip = store.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return createHash("sha256").update(ip).digest("hex");
}

export async function subscribeForm(formData: FormData): Promise<void> {
  const returnPath = text(formData, "returnPath") || "/newsletter";
  try {
    const hash = await ipHash();
    if (newsletterLimited(hash)) throw new NewsletterError("Try again later.", 429);
    const session = await auth().catch(() => null);
    const result = await subscribeNewsletter({
      email: text(formData, "email"),
      consent: formData.get("consent") === "yes",
      noticeVersion: text(formData, "noticeVersion") || (await currentNoticeVersion()),
      topics: formData.getAll("topics").map(String),
      source: "newsletter-form",
      ipHash: hash,
      idempotencyKey: text(formData, "idempotencyKey") || randomUUID().replace(/-/g, "").slice(0, 24),
      actorId: session?.user?.id || null,
      website: text(formData, "website"),
      replaceTopics: formData.get("replaceTopics") === "yes",
    });
    if (result.stored && result.status === "CONFIRMED") {
      const jar = await cookies();
      await recordProductEvent({
        name: "newsletter_subscribed",
        consent: consentFromCookie(jar.get("me_analytics")?.value),
        anonymousKey: jar.get("me_anon")?.value,
        userId: session?.user?.id,
        properties: { source: "newsletter-form" },
      });
    }
  } catch (error) {
    fail(returnPath, error);
  }
  redirect(`${returnPath}?notice=subscribed`);
}

export async function unsubscribeForm(formData: FormData): Promise<void> {
  const token = text(formData, "token");
  const id = subscriptionIdFromToken(token);
  if (!id) fail("/newsletter/unsubscribe", new NewsletterError("This link is not valid.", 404));
  try {
    await unsubscribeNewsletter(id);
  } catch (error) {
    fail(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, error);
  }
  redirect("/newsletter/unsubscribe?notice=done");
}

export async function preferencesForm(formData: FormData): Promise<void> {
  const token = text(formData, "token");
  const id = subscriptionIdFromToken(token);
  if (!id) fail("/newsletter/preferences", new NewsletterError("This link is not valid.", 404));
  try {
    await updateNewsletterPreferences(id, formData.getAll("topics").map(String));
  } catch (error) {
    fail(`/newsletter/preferences?token=${encodeURIComponent(token)}`, error);
  }
  redirect(`/newsletter/preferences?token=${encodeURIComponent(token)}&notice=saved`);
}

export async function accountNewsletterForm(formData: FormData): Promise<void> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  if (!userId) redirect("/login?next=/account/preferences");
  try {
    const profile = await readProfile(userId);
    const current = await readSubscriptionByEmail(profile.email);
    if (!current) throw new NewsletterError("Subscribe from the newsletter page first.", 404);
    if (text(formData, "intent") === "unsubscribe") {
      await unsubscribeNewsletter(current.id);
    } else {
      await updateNewsletterPreferences(current.id, formData.getAll("topics").map(String));
    }
  } catch (error) {
    fail("/account/preferences", error);
  }
  redirect("/account/preferences?saved=1");
}

async function staffId(): Promise<string> {
  const session = await auth().catch(() => null);
  const id = session?.user?.id || "";
  if (!id || !session?.user?.staff) redirect("/login");
  return id;
}

export async function importNewsletterForm(formData: FormData): Promise<void> {
  const userId = await staffId();
  try {
    await importSubscriptions(userId, text(formData, "emails"), formData.get("attestation") === "yes");
  } catch (error) {
    fail("/admin/newsletter", error);
  }
  redirect("/admin/newsletter?notice=imported");
}

export async function suppressNewsletterForm(formData: FormData): Promise<void> {
  const userId = await staffId();
  try {
    await suppressSubscription(userId, text(formData, "id"));
  } catch (error) {
    fail("/admin/newsletter", error);
  }
  redirect("/admin/newsletter?notice=suppressed");
}
