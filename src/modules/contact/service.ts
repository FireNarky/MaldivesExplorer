import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { logError } from "@/lib/observability/log";
import { writeAudit } from "@/modules/audit/service";
import { emptyDraft } from "@/modules/enquiries/rules";
import { EnquiryError, submitEnquiry } from "@/modules/enquiries/service";
import { userHasPermission } from "@/modules/identity/service";
import { ContactSettings, DEFAULT_CONTACT_SETTINGS } from "./types";

export const SETTINGS_KEY = "contact.channels";
export const PUBLIC_CONTACT_ERROR = "Your enquiry could not be sent right now. Please try again.";

export class ContactAuthError extends Error {
  readonly status: number;

  constructor(message = "This account cannot manage settings.", status = 403) {
    super(message);
    this.name = "ContactAuthError";
    this.status = status;
  }
}

function parseSettingsObject(raw: unknown): ContactSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_CONTACT_SETTINGS };
  }
  const val = raw as Record<string, unknown>;
  return {
    whatsappEnabled:
      typeof val.whatsappEnabled === "boolean"
        ? val.whatsappEnabled
        : DEFAULT_CONTACT_SETTINGS.whatsappEnabled,
    whatsappNumber:
      typeof val.whatsappNumber === "string"
        ? val.whatsappNumber
        : DEFAULT_CONTACT_SETTINGS.whatsappNumber,
    whatsappMessage:
      typeof val.whatsappMessage === "string"
        ? val.whatsappMessage
        : DEFAULT_CONTACT_SETTINGS.whatsappMessage,
    messengerEnabled:
      typeof val.messengerEnabled === "boolean"
        ? val.messengerEnabled
        : DEFAULT_CONTACT_SETTINGS.messengerEnabled,
    messengerUsername:
      typeof val.messengerUsername === "string"
        ? val.messengerUsername
        : DEFAULT_CONTACT_SETTINGS.messengerUsername,
    telegramEnabled:
      typeof val.telegramEnabled === "boolean"
        ? val.telegramEnabled
        : DEFAULT_CONTACT_SETTINGS.telegramEnabled,
    telegramUsername:
      typeof val.telegramUsername === "string"
        ? val.telegramUsername
        : DEFAULT_CONTACT_SETTINGS.telegramUsername,
    email: typeof val.email === "string" ? val.email : DEFAULT_CONTACT_SETTINGS.email,
    phone: typeof val.phone === "string" ? val.phone : DEFAULT_CONTACT_SETTINGS.phone,
    officeHours:
      typeof val.officeHours === "string" ? val.officeHours : DEFAULT_CONTACT_SETTINGS.officeHours,
    address: typeof val.address === "string" ? val.address : DEFAULT_CONTACT_SETTINGS.address,
    emergencyDesk:
      typeof val.emergencyDesk === "string"
        ? val.emergencyDesk
        : DEFAULT_CONTACT_SETTINGS.emergencyDesk,
  };
}

export async function getContactSettings(): Promise<ContactSettings> {
  try {
    const row = await db.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
      select: { value: true },
    });
    if (row?.value) {
      return parseSettingsObject(row.value);
    }
  } catch {
    logError("Contact settings could not be loaded.");
  }
  return { ...DEFAULT_CONTACT_SETTINGS };
}

export async function saveContactSettings(
  settings: ContactSettings,
  actorId?: string | null,
): Promise<ContactSettings> {
  if (!actorId) {
    throw new ContactAuthError("Sign in is required to manage settings.", 401);
  }
  if (!(await userHasPermission(actorId, "setting.manage"))) {
    throw new ContactAuthError("This account cannot manage settings.", 403);
  }

  const payload: ContactSettings = {
    whatsappEnabled: Boolean(settings.whatsappEnabled),
    whatsappNumber: settings.whatsappNumber.trim().slice(0, 60),
    whatsappMessage: settings.whatsappMessage.trim().slice(0, 300),
    messengerEnabled: Boolean(settings.messengerEnabled),
    messengerUsername: settings.messengerUsername.trim().slice(0, 120),
    telegramEnabled: Boolean(settings.telegramEnabled),
    telegramUsername: settings.telegramUsername.trim().slice(0, 120),
    email: settings.email.trim().slice(0, 200),
    phone: settings.phone.trim().slice(0, 60),
    officeHours: settings.officeHours.trim().slice(0, 200),
    address: settings.address.trim().slice(0, 300),
    emergencyDesk: settings.emergencyDesk.trim().slice(0, 200),
  };

  await db.$transaction(async (tx) => {
    const existing = await tx.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
      select: { value: true },
    });
    const before = existing?.value ? parseSettingsObject(existing.value) : null;

    await tx.systemSetting.upsert({
      where: { key: SETTINGS_KEY },
      create: {
        key: SETTINGS_KEY,
        value: { ...payload },
        updatedById: actorId,
      },
      update: {
        value: { ...payload },
        updatedById: actorId,
        updatedAt: new Date(),
      },
    });

    await writeAudit(
      {
        actorId,
        action: "setting.update",
        entityType: "system_setting",
        entityId: actorId,
        before: before ? { key: SETTINGS_KEY, ...before } : { key: SETTINGS_KEY },
        after: { key: SETTINGS_KEY, ...payload },
      },
      tx,
    );
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
  consent?: boolean;
  noticeVersion?: string;
  idempotencyKey?: string;
  userId?: string | null;
  ipHash?: string | null;
}

export function validateContactEnquiryInput(input: ContactEnquiryInput):
  | {
      valid: true;
      cleaned: {
        name: string;
        email: string;
        phone: string;
        topic: string;
        dates: string;
        message: string;
        noticeVersion: string;
        idempotencyKey: string;
      };
    }
  | {
      valid: false;
      error: string;
    } {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = (input.phone ?? "").trim();
  const topic = (input.topic ?? "").trim().slice(0, 100);
  const dates = (input.dates ?? "").trim();
  const message = input.message.trim();

  if (name.length < 2 || name.length > 120) {
    return { valid: false, error: "Please enter your full name." };
  }
  if (!z.string().email().safeParse(email).success || email.length > 200) {
    return { valid: false, error: "Please enter a valid email address." };
  }
  if (phone.length > 40) {
    return { valid: false, error: "The phone number can be at most 40 characters." };
  }
  if (dates.length > 200) {
    return { valid: false, error: "Target dates can be at most 200 characters." };
  }
  if (message.length < 10) {
    return {
      valid: false,
      error: "Please describe your travel request (at least 10 characters).",
    };
  }
  if (message.length > 1800) {
    return { valid: false, error: "Your message can be at most 1,800 characters." };
  }
  if (input.consent !== true) {
    return { valid: false, error: "Consent is required before your enquiry can be sent." };
  }

  const rawKey = (input.idempotencyKey ?? "").trim();
  const idempotencyKey = /^[A-Za-z0-9_-]{8,80}$/.test(rawKey)
    ? rawKey
    : randomBytes(16).toString("hex");
  const noticeVersion = (input.noticeVersion ?? "").trim() || "2026-10-10";

  return {
    valid: true,
    cleaned: {
      name,
      email,
      phone,
      topic,
      dates,
      message,
      noticeVersion,
      idempotencyKey,
    },
  };
}

export async function submitContactEnquiry(
  input: ContactEnquiryInput,
): Promise<{ success: boolean; reference: string; error?: string }> {
  const checked = validateContactEnquiryInput(input);
  if (!checked.valid) {
    return { success: false, reference: "", error: checked.error };
  }

  const { name, email, phone, topic, dates, message, noticeVersion, idempotencyKey } =
    checked.cleaned;

  try {
    let matchedUserId: string | null = null;
    if (input.userId) {
      const account = await db.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      });
      if (account && account.email.toLowerCase() === email) {
        matchedUserId = input.userId;
      }
    }

    const draft = emptyDraft(idempotencyKey);
    draft.name = name;
    draft.email = email;
    draft.phone = phone;
    draft.flexibility = dates;
    draft.requirements = topic ? `[Topic: ${topic}]\n${message}` : message;
    draft.consent = true;
    // /contact does not collect party size. adultCount is a required column, so store a
    // placeholder and mark it as not supplied (see modules/enquiries/party.ts).
    draft.adultCount = "1";
    draft.source = "contact_page";
    draft.landingPath = "/contact";

    const result = await submitEnquiry(draft, {
      userId: matchedUserId,
      ipHash: input.ipHash ?? null,
      idempotencyKey,
      consentSource: "contact_page",
      noticeVersion,
      partySupplied: false,
    });

    return {
      success: true,
      reference: result.reference,
    };
  } catch (error) {
    if (error instanceof EnquiryError) {
      return {
        success: false,
        reference: "",
        error: error.message,
      };
    }
    logError("Contact enquiry submission failed.");
    return {
      success: false,
      reference: "",
      error: PUBLIC_CONTACT_ERROR,
    };
  }
}
