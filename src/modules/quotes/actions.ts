"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { noteConsentEvent } from "@/modules/analytics/service";
import { isNextRedirect } from "@/lib/http/navigation";
import { PortalError, openAccount } from "@/modules/customers/service";
import {
  QuoteError,
  addItem,
  addSegment,
  approveVersion,
  createNextVersion,
  createQuote,
  removeItem,
  removeSegment,
  respondToQuoteVersion,
  saveDraft,
  sendVersion,
  submitForReview,
  withdrawVersion,
} from "@/modules/quotes/service";

async function staffId(): Promise<string> {
  const session = await auth().catch(() => null);
  const id = session?.user?.id || "";
  if (!id || !session?.user?.staff) redirect("/login");
  return id;
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function fail(path: string, error: unknown, fallback: string): never {
  if (isNextRedirect(error)) throw error;
  const message =
    error instanceof QuoteError || error instanceof PortalError ? error.message : fallback;
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}error=${encodeURIComponent(message)}`);
}

export async function createQuoteForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const reference = text(formData, "reference");
  try {
    const quote = await createQuote(id, reference);
    redirect(`/admin/quotes/${quote.quoteId}?notice=created`);
  } catch (error) {
    fail(`/admin/enquiries/${reference}`, error, "The quote could not be saved.");
  }
}

export async function saveDraftForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await saveDraft(id, quoteId, {
      welcome: text(formData, "welcome"),
      overview: text(formData, "overview"),
      inclusions: text(formData, "inclusions"),
      exclusions: text(formData, "exclusions"),
      terms: text(formData, "terms"),
      expiresOn: text(formData, "expiresOn"),
    });
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=saved`);
}

export async function addSegmentForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await addSegment(id, quoteId, {
      startDate: text(formData, "startDate"),
      endDate: text(formData, "endDate"),
      resortId: text(formData, "resortId"),
      mealPlanId: text(formData, "mealPlanId"),
      transfer: text(formData, "transfer"),
      notes: text(formData, "notes"),
    });
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=saved`);
}

export async function removeSegmentForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await removeSegment(id, quoteId, text(formData, "segmentId"));
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=saved`);
}

export async function addItemForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await addItem(id, quoteId, {
      itemType: text(formData, "itemType"),
      description: text(formData, "description"),
      quantity: text(formData, "quantity"),
      unitAmount: text(formData, "unitAmount"),
      taxAmount: text(formData, "taxAmount"),
      discountAmount: text(formData, "discountAmount"),
    });
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=saved`);
}

export async function removeItemForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await removeItem(id, quoteId, text(formData, "itemId"));
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=saved`);
}

export async function submitQuoteForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await submitForReview(id, quoteId);
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=submitted`);
}

export async function withdrawQuoteForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await withdrawVersion(id, quoteId);
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=saved`);
}

export async function approveQuoteForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await approveVersion(id, text(formData, "versionId"));
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=approved`);
}

export async function sendQuoteForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await sendVersion(id, text(formData, "versionId"));
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=sent`);
}

export async function newVersionForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const quoteId = text(formData, "quoteId");
  try {
    await createNextVersion(id, quoteId);
  } catch (error) {
    fail(`/admin/quotes/${quoteId}`, error, "The quote could not be saved.");
  }
  redirect(`/admin/quotes/${quoteId}?notice=saved`);
}

export async function respondToQuoteForm(formData: FormData): Promise<void> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  const versionId = text(formData, "versionId");
  const path = `/account/quotes/${versionId}`;
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  try {
    const customer = await openAccount(userId);
    await respondToQuoteVersion({
      customerId: customer.id,
      actorId: userId,
      versionId,
      responseType: text(formData, "responseType"),
      message: text(formData, "message"),
      idempotencyKey: text(formData, "idempotencyKey"),
    });
    await noteConsentEvent("quote_response", { responseType: text(formData, "responseType") });
  } catch (error) {
    fail(path, error, "The response could not be saved.");
  }
  redirect(`${path}?notice=recorded`);
}
