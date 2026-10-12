"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isNextRedirect } from "@/lib/http/navigation";
import { postOwnMessage } from "@/modules/customers/records";
import { consentUpdatesFromList } from "@/modules/customers/rules";
import {
  PortalError,
  requestPrivacy,
  saveConsent,
  updateProfile,
} from "@/modules/customers/service";

async function userId(): Promise<string> {
  const session = await auth().catch(() => null);
  const id = session?.user?.id || "";
  if (!id) redirect("/login?next=/account");
  return id;
}

function fail(path: string, error: unknown): never {
  if (isNextRedirect(error)) throw error;
  const message = error instanceof PortalError ? error.message : "The account could not be saved.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function addressHash(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return createHash("sha256").update(forwarded).digest("hex");
}

export async function updateProfileForm(formData: FormData): Promise<void> {
  const id = await userId();
  try {
    await updateProfile(id, {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      countryCode: String(formData.get("countryCode") ?? ""),
    });
  } catch (error) {
    fail("/account/profile", error);
  }
  redirect("/account/profile?saved=1");
}

export async function updatePreferencesForm(formData: FormData): Promise<void> {
  const id = await userId();
  try {
    await updateProfile(id, { locale: String(formData.get("locale") ?? "") });
  } catch (error) {
    fail("/account/preferences", error);
  }
  redirect("/account/preferences?saved=1");
}

export async function updateConsentForm(formData: FormData): Promise<void> {
  const id = await userId();
  try {
    await saveConsent(
      id,
      consentUpdatesFromList(formData.getAll("purpose").map((value) => String(value))),
      await addressHash(),
    );
  } catch (error) {
    fail("/account/consent", error);
  }
  redirect("/account/consent?saved=1");
}

export async function requestExportForm(): Promise<void> {
  const id = await userId();
  try {
    await requestPrivacy(id, "export");
  } catch (error) {
    fail("/account/privacy", error);
  }
  redirect("/account/privacy?export=1");
}

export async function requestDeletionForm(): Promise<void> {
  const id = await userId();
  try {
    await requestPrivacy(id, "deletion");
  } catch (error) {
    fail("/account/privacy", error);
  }
  redirect("/account/privacy?deletion=1");
}

export async function sendMessageForm(formData: FormData): Promise<void> {
  const id = await userId();
  const reference = String(formData.get("reference") ?? "");
  try {
    await postOwnMessage(id, reference, String(formData.get("body") ?? ""));
  } catch (error) {
    fail(`/account/messages/${encodeURIComponent(reference)}`, error);
  }
  redirect(`/account/messages/${encodeURIComponent(reference)}?sent=1`);
}
