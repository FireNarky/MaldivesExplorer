"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isNextRedirect } from "@/lib/http/navigation";
import {
  ReviewError,
  createReview,
  featureReview,
  hideReview,
  publishReview,
  rejectReview,
  updateReview,
  type ReviewInput,
} from "@/modules/reviews/service";

async function staffId(): Promise<string> {
  const session = await auth().catch(() => null);
  const id = session?.user?.id || "";
  if (!id || !session?.user?.staff) redirect("/login");
  return id;
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function fail(path: string, error: unknown): never {
  if (isNextRedirect(error)) throw error;
  const message = error instanceof ReviewError ? error.message : "The review could not be saved.";
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}error=${encodeURIComponent(message)}`);
}

function input(formData: FormData): ReviewInput {
  return {
    resortId: text(formData, "resortId"),
    sourceType: text(formData, "sourceType"),
    sourceReference: text(formData, "sourceReference"),
    displayName: text(formData, "displayName"),
    rating: text(formData, "rating"),
    ratingBasis: text(formData, "ratingBasis"),
    body: text(formData, "body"),
    consent: formData.get("consent") === "yes",
  };
}

export async function createReviewForm(formData: FormData): Promise<void> {
  const userId = await staffId();
  try {
    const id = await createReview(userId, input(formData));
    redirect(`/admin/reviews/${id}?notice=saved`);
  } catch (error) {
    fail("/admin/reviews", error);
  }
}

export async function updateReviewForm(formData: FormData): Promise<void> {
  const userId = await staffId();
  const id = text(formData, "id");
  try {
    await updateReview(userId, id, input(formData));
  } catch (error) {
    fail(`/admin/reviews/${id}`, error);
  }
  redirect(`/admin/reviews/${id}?notice=saved`);
}

export async function publishReviewForm(formData: FormData): Promise<void> {
  const userId = await staffId();
  const id = text(formData, "id");
  try {
    await publishReview(userId, id);
  } catch (error) {
    fail(`/admin/reviews/${id}`, error);
  }
  redirect(`/admin/reviews/${id}?notice=published`);
}

export async function hideReviewForm(formData: FormData): Promise<void> {
  const userId = await staffId();
  const id = text(formData, "id");
  try {
    await hideReview(userId, id);
  } catch (error) {
    fail(`/admin/reviews/${id}`, error);
  }
  redirect(`/admin/reviews/${id}?notice=hidden`);
}

export async function rejectReviewForm(formData: FormData): Promise<void> {
  const userId = await staffId();
  const id = text(formData, "id");
  try {
    await rejectReview(userId, id);
  } catch (error) {
    fail(`/admin/reviews/${id}`, error);
  }
  redirect(`/admin/reviews/${id}?notice=rejected`);
}

export async function featureReviewForm(formData: FormData): Promise<void> {
  const userId = await staffId();
  const id = text(formData, "id");
  try {
    await featureReview(userId, id, text(formData, "featured") === "yes");
  } catch (error) {
    fail(`/admin/reviews/${id}`, error);
  }
  redirect(`/admin/reviews/${id}?notice=featured`);
}
