import { db } from "@/lib/db";
import { ContactSettings, DEFAULT_CONTACT_SETTINGS } from "./types";
import { randomBytes } from "crypto";

const SETTINGS_KEY = "contact.channels";

export async function getContactSettings(): Promise<ContactSettings> {
  try {
    const row = await db.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
      select: { value: true },
    });

    if (row?.value && typeof row.value === "object" && !Array.isArray(row.value)) {
      const val = row.value as Record<string, unknown>;
      return {
        whatsappEnabled: typeof val.whatsappEnabled === "boolean" ? val.whatsappEnabled : DEFAULT_CONTACT_SETTINGS.whatsappEnabled,
        whatsappNumber: typeof val.whatsappNumber === "string" ? val.whatsappNumber : DEFAULT_CONTACT_SETTINGS.whatsappNumber,
        whatsappMessage: typeof val.whatsappMessage === "string" ? val.whatsappMessage : DEFAULT_CONTACT_SETTINGS.whatsappMessage,
        messengerEnabled: typeof val.messengerEnabled === "boolean" ? val.messengerEnabled : DEFAULT_CONTACT_SETTINGS.messengerEnabled,
        messengerUsername: typeof val.messengerUsername === "string" ? val.messengerUsername : DEFAULT_CONTACT_SETTINGS.messengerUsername,
        telegramEnabled: typeof val.telegramEnabled === "boolean" ? val.telegramEnabled : DEFAULT_CONTACT_SETTINGS.telegramEnabled,
        telegramUsername: typeof val.telegramUsername === "string" ? val.telegramUsername : DEFAULT_CONTACT_SETTINGS.telegramUsername,
        email: typeof val.email === "string" ? val.email : DEFAULT_CONTACT_SETTINGS.email,
        phone: typeof val.phone === "string" ? val.phone : DEFAULT_CONTACT_SETTINGS.phone,
        officeHours: typeof val.officeHours === "string" ? val.officeHours : DEFAULT_CONTACT_SETTINGS.officeHours,
        address: typeof val.address === "string" ? val.address : DEFAULT_CONTACT_SETTINGS.address,
        emergencyDesk: typeof val.emergencyDesk === "string" ? val.emergencyDesk : DEFAULT_CONTACT_SETTINGS.emergencyDesk,
      };
    }
  } catch (error) {
    console.error("Failed to load contact settings:", error);
  }
  return DEFAULT_CONTACT_SETTINGS;
}

export async function saveContactSettings(
  settings: ContactSettings,
  updatedById?: string
): Promise<ContactSettings> {
  const payload = {
    whatsappEnabled: Boolean(settings.whatsappEnabled),
    whatsappNumber: settings.whatsappNumber.trim(),
    whatsappMessage: settings.whatsappMessage.trim(),
    messengerEnabled: Boolean(settings.messengerEnabled),
    messengerUsername: settings.messengerUsername.trim(),
    telegramEnabled: Boolean(settings.telegramEnabled),
    telegramUsername: settings.telegramUsername.trim(),
    email: settings.email.trim(),
    phone: settings.phone.trim(),
    officeHours: settings.officeHours.trim(),
    address: settings.address.trim(),
    emergencyDesk: settings.emergencyDesk.trim(),
  };

  await db.systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: {
      key: SETTINGS_KEY,
      value: payload,
      updatedById: updatedById || null,
    },
    update: {
      value: payload,
      updatedById: updatedById || null,
      updatedAt: new Date(),
    },
  });

  return payload;
}

export interface ContactEnquiryInput {
  name: string;
  email: string;
  phone?: string;
  topic?: string;
  dates?: string;
  message: string;
  userId?: string;
}

export async function submitContactEnquiry(
  input: ContactEnquiryInput
): Promise<{ success: boolean; reference: string; error?: string }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim();

  if (!name || name.length < 2) {
    return { success: false, reference: "", error: "Please enter your full name." };
  }
  if (!email || !email.includes("@")) {
    return { success: false, reference: "", error: "Please enter a valid email address." };
  }
  if (!message || message.length < 10) {
    return { success: false, reference: "", error: "Please describe your travel request (at least 10 characters)." };
  }

  const idempotencyKey = randomBytes(16).toString("hex");

  try {
    return await db.$transaction(async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findFirst({
        where: { email },
        select: { id: true },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            email,
            name,
            phone: input.phone?.trim() || null,
            userId: input.userId || null,
          },
          select: { id: true },
        });
      }

      // Generate reference
      let reference: string;
      try {
        const [sequence] = await tx.$queryRaw<Array<{ n: bigint }>>`
          SELECT nextval('enquiry_reference_seq') AS n
        `;
        reference = `ME-C-${String(sequence?.n ?? 1n).padStart(6, "0")}`;
      } catch {
        reference = `ME-C-${Date.now().toString().slice(-6)}`;
      }

      const submittedSnapshot = {
        name,
        email,
        phone: input.phone?.trim() || null,
        topic: input.topic?.trim() || "General Concierge Enquiry",
        dates: input.dates?.trim() || null,
        message,
        source: "contact_page",
      };

      // Create enquiry
      const enquiry = await tx.enquiry.create({
        data: {
          reference,
          customerId: customer.id,
          source: "contact_page",
          requirements: `[Topic: ${input.topic || "General"}] [Dates: ${input.dates || "Flexible"}]\n${message}`,
          adultCount: 2,
          status: "NEW",
          idempotencyKey,
          submittedSnapshot,
        },
        select: { reference: true },
      });

      return { success: true, reference: enquiry.reference };
    });
  } catch (err: unknown) {
    console.error("submitContactEnquiry error:", err);
    return {
      success: false,
      reference: "",
      error: err instanceof Error ? err.message : "Failed to record enquiry.",
    };
  }
}
