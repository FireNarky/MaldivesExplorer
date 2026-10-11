"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeSearchQuery, writeRecentSearches } from "@/modules/search/query";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.APP_ENV === "production",
  };
}

export async function setAnalyticsConsent(formData: FormData): Promise<void> {
  const choice = formData.get("choice") === "granted" ? "granted" : "denied";
  const store = await cookies();
  store.set("me_analytics", choice, cookieOptions());
  if (choice === "granted" && !store.get("me_anon")?.value) {
    store.set("me_anon", randomUUID(), cookieOptions());
  }
}

export async function runSearch(formData: FormData): Promise<void> {
  const query = normalizeSearchQuery(String(formData.get("q") ?? ""));
  const kind = String(formData.get("type") ?? "");
  const store = await cookies();
  if (query.length > 0) {
    store.set(
      "me_recent",
      writeRecentSearches(store.get("me_recent")?.value, query),
      cookieOptions(),
    );
  }
  const params = new URLSearchParams();
  if (query.length > 0) params.set("q", query);
  if (
    kind === "resorts" ||
    kind === "atolls" ||
    kind === "islands" ||
    kind === "experiences" ||
    kind === "guides" ||
    kind === "collections"
  ) {
    params.set("type", kind);
  }
  const suffix = params.toString();
  redirect(suffix.length > 0 ? `/search?${suffix}` : "/search");
}
