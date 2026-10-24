"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logError } from "@/lib/observability/log";
import { userHasPermission } from "@/modules/identity/service";
import {
  ContactAuthError,
  PUBLIC_CONTACT_ERROR,
  saveContactSettings,
  submitContactEnquiry,
} from "./service";
import { ContactSettings } from "./types";

export type ContactEnquiryState = {
  success: boolean;
  reference?: string;
  error?: string;
};

export type ContactSettingsState = {
  success: boolean;
  message?: string;
};

export async function saveContactSettingsAction(
  prevState: ContactSettingsState,
  formData: FormData,
): Promise<ContactSettingsState> {
  void prevState;
  const session = await auth().catch(() => null);
  if (!session?.user?.id || !session.user.staff) {
    return { success: false, message: "Unauthorized. Staff login required." };
  }
  if (!(await userHasPermission(session.user.id, "setting.manage"))) {
    return { success: false, message: "This account cannot manage settings." };
  }

  const settings: ContactSettings = {
    whatsappEnabled: formData.get("whatsappEnabled") === "on",
    whatsappNumber: String(formData.get("whatsappNumber") || "").trim(),
    whatsappMessage: String(formData.get("whatsappMessage") || "").trim(),
    messengerEnabled: formData.get("messengerEnabled") === "on",
    messengerUsername: String(formData.get("messengerUsername") || "").trim(),
    telegramEnabled: formData.get("telegramEnabled") === "on",
    telegramUsername: String(formData.get("telegramUsername") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    officeHours: String(formData.get("officeHours") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    emergencyDesk: String(formData.get("emergencyDesk") || "").trim(),
  };

  try {
    await saveContactSettings(settings, session.user.id);
    revalidatePath("/contact");
    revalidatePath("/");
    revalidatePath("/admin/settings/contact");
    return { success: true, message: "Contact & messaging settings updated successfully." };
  } catch (err: unknown) {
    if (err instanceof ContactAuthError) {
      return { success: false, message: err.message };
    }
    logError("Contact settings update failed.");
    return { success: false, message: "Contact settings could not be updated right now." };
  }
}

export async function submitContactEnquiryAction(
  prevState: ContactEnquiryState,
  formData: FormData,
): Promise<ContactEnquiryState> {
  void prevState;
  try {
    const honeypot = formData.get("website");
    if (honeypot && String(honeypot).trim().length > 0) {
      return { success: false, error: PUBLIC_CONTACT_ERROR };
    }

    const session = await auth().catch(() => null);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const topic = String(formData.get("topic") || "").trim();
    const dates = String(formData.get("dates") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const consentValue = formData.get("consent");
    const consent = consentValue === "yes" || consentValue === "on";
    const noticeVersion = String(formData.get("noticeVersion") || "").trim();
    const idempotencyKey = String(formData.get("idempotencyKey") || "").trim();

    return await submitContactEnquiry({
      name,
      email,
      phone,
      topic,
      dates,
      message,
      consent,
      noticeVersion,
      idempotencyKey,
      userId: session?.user?.id ?? null,
    });
  } catch {
    logError("Contact enquiry action failed.");
    return { success: false, error: PUBLIC_CONTACT_ERROR };
  }
}
