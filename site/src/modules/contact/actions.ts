"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { saveContactSettings, submitContactEnquiry } from "./service";
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
  formData: FormData
): Promise<ContactSettingsState> {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) {
    return { success: false, message: "Unauthorized. Staff login required." };
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
    return { success: false, message: err instanceof Error ? err.message : "Failed to update settings." };
  }
}

export async function submitContactEnquiryAction(
  prevState: ContactEnquiryState,
  formData: FormData
): Promise<ContactEnquiryState> {
  // Honeypot spam protection
  const honeypot = formData.get("website");
  if (honeypot && String(honeypot).trim().length > 0) {
    // Silently succeed for bots
    return { success: true, reference: "ME-C-000000" };
  }

  const session = await auth().catch(() => null);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const topic = String(formData.get("topic") || "").trim();
  const dates = String(formData.get("dates") || "").trim();
  const message = String(formData.get("message") || "").trim();

  const res = await submitContactEnquiry({
    name,
    email,
    phone,
    topic,
    dates,
    message,
    userId: session?.user?.id,
  });

  return res;
}
