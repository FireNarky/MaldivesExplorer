import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(),
  AuthError: class AuthError extends Error {},
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { roleHasPermission } from "@/lib/auth/permissions";
import { publicMetadata } from "@/lib/seo/metadata";
import {
  activeContactChannels,
  DEFAULT_CONTACT_SETTINGS,
  type ContactSettings,
} from "@/modules/contact/types";
import {
  ContactAuthError,
  PUBLIC_CONTACT_ERROR,
  saveContactSettings,
  SETTINGS_KEY,
  submitContactEnquiry,
  validateContactEnquiryInput,
} from "@/modules/contact/service";
import { saveContactSettingsAction } from "@/modules/contact/actions";
import { ContactForm } from "@/components/contact/contact-form";
import { FloatingChatWidget } from "@/components/chat/floating-chat-widget";
import { LoginForm } from "@/app/login/login-form";
import RegisterPage, { metadata as registerMetadata } from "@/app/register/page";
import { metadata as loginMetadata } from "@/app/login/page";
import { metadata as newsletterMetadata } from "@/app/newsletter/page";
import PrivacyPage, { metadata as privacyMetadata } from "@/app/privacy/page";
import TermsPage, { metadata as termsMetadata } from "@/app/terms/page";
import ContactPage from "@/app/contact/page";
import robots from "@/app/robots";
import HomePage from "@/app/page";
import { db } from "@/lib/db";
import * as authMod from "@/auth";
import * as logMod from "@/lib/observability/log";
import * as auditMod from "@/modules/audit/service";
import * as enquiryMod from "@/modules/enquiries/service";
import { PARTY_NOT_SUPPLIED_LABEL, partySupplied } from "@/modules/enquiries/party";
import * as identityMod from "@/modules/identity/service";
import * as reviewMod from "@/modules/reviews/service";
import * as catalogMod from "@/modules/catalog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Phase 1 — Contact enquiry flow & PII protection (F-01, F-03.2)", () => {
  it("rejects unchecked consent on the server before touching the database", async () => {
    const submitSpy = vi.spyOn(enquiryMod, "submitEnquiry");
    const result = await submitContactEnquiry({
      name: "Test Traveler",
      email: "traveler@example.com",
      message: "Looking for a 5-night water villa itinerary.",
      consent: false,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Consent is required before your enquiry can be sent.");
    expect(submitSpy).not.toHaveBeenCalled();

    const validation = validateContactEnquiryInput({
      name: "Test Traveler",
      email: "traveler@example.com",
      message: "Looking for a 5-night water villa itinerary.",
    });
    expect(validation.valid).toBe(false);
  });

  it("creates a canonical ME-E enquiry with adultCount 1, contact_page source, and explicit consent", async () => {
    const submitSpy = vi.spyOn(enquiryMod, "submitEnquiry").mockResolvedValue({
      reference: "ME-E-000042",
      duplicate: false,
      missing: [],
      created: true,
    });

    const result = await submitContactEnquiry({
      name: "Amina Ibrahim",
      email: "Amina@Example.com",
      phone: "+960 7000000",
      topic: "Seaplane & Transfers",
      dates: "November 2026 (6 nights)",
      message: "Please advise on daylight seaplane transfers and half-board options.",
      consent: true,
      noticeVersion: "2026-10-10",
      idempotencyKey: "contact-key-12345678",
    });

    expect(result).toEqual({
      success: true,
      reference: "ME-E-000042",
    });
    expect(result.reference).toMatch(/^ME-E-\d{6}$/);
    expect(result.reference).not.toMatch(/^ME-C-/);
    expect(submitSpy).toHaveBeenCalledTimes(1);

    const [draft, context] = submitSpy.mock.calls[0]!;
    expect(draft.adultCount).toBe("1");
    expect(draft.source).toBe("contact_page");
    expect(draft.landingPath).toBe("/contact");
    expect(draft.consent).toBe(true);
    expect(draft.flexibility).toBe("November 2026 (6 nights)");
    expect(draft.requirements).toContain("[Topic: Seaplane & Transfers]");
    expect(context.consentSource).toBe("contact_page");
    expect(context.noticeVersion).toBe("2026-10-10");
    expect(context.idempotencyKey).toBe("contact-key-12345678");
    // adultCount 1 is a placeholder: /contact never asks for party size.
    expect(context.partySupplied).toBe(false);
  });

  it("distinguishes a placeholder party size from a customer-supplied one", () => {
    expect(partySupplied({ party: { adults: 1, childAges: [], supplied: false } })).toBe(false);
    expect(partySupplied({ party: { adults: 2, childAges: [8], supplied: true } })).toBe(true);
    // Snapshots written before the marker existed came from the planner, which asks for party.
    expect(partySupplied({ party: { adults: 2, childAges: [] } })).toBe(true);
    expect(partySupplied(null)).toBe(true);
    expect(PARTY_NOT_SUPPLIED_LABEL).toMatch(/not supplied by customer/i);
    expect(PARTY_NOT_SUPPLIED_LABEL).toMatch(/placeholder/i);
  });

  it("never leaks raw Prisma/PostgreSQL errors or submitted PII when a database error occurs", async () => {
    const logged: string[] = [];
    vi.spyOn(logMod, "logError").mockImplementation((msg: string) => {
      logged.push(msg);
    });
    vi.spyOn(enquiryMod, "submitEnquiry").mockRejectedValue(
      new Error(
        'Invalid `prisma.enquiry.create()` invocation: PostgresError { code: "23514", message: "new row for relation \\"enquiries\\" violates check constraint \\"enquiries_reference\\"", detail: Some("Failing row contains (9099a1a0, ME-C-000002, Secret Guest Name, secret.pii@example.com, +447700900999, My private medical & dietary notes).") }',
      ),
    );

    const result = await submitContactEnquiry({
      name: "Secret Guest Name",
      email: "secret.pii@example.com",
      phone: "+447700900999",
      dates: "December 2026",
      message: "My private medical & dietary notes.",
      consent: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(PUBLIC_CONTACT_ERROR);
    expect(result.error).not.toContain("prisma");
    expect(result.error).not.toContain("23514");
    expect(result.error).not.toContain("enquiries_reference");
    expect(result.error).not.toContain("Secret Guest Name");
    expect(result.error).not.toContain("secret.pii@example.com");
    expect(result.error).not.toContain("+447700900999");
    expect(result.error).not.toContain("private medical");
    expect(logged.join(" ")).not.toContain("secret.pii@example.com");
    expect(logged.join(" ")).not.toContain("Secret Guest Name");
  });

  it("renders ContactForm with consent unchecked by default and preserves field values on validation error", () => {
    render(<ContactForm noticeVersion="2026-10-10" />);

    const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/Phone \/ WhatsApp/i) as HTMLInputElement;
    const datesInput = screen.getByLabelText(/Target Month \/ Dates/i) as HTMLInputElement;
    const messageInput = screen.getByLabelText(
      /Travel Requirements & Notes/i,
    ) as HTMLTextAreaElement;
    const consentCheckbox = screen.getByRole("checkbox") as HTMLInputElement;

    expect(consentCheckbox).not.toBeChecked();

    fireEvent.change(nameInput, { target: { value: "Nadia Rahman" } });
    fireEvent.change(emailInput, { target: { value: "nadia@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "+44 7700 900111" } });
    fireEvent.change(datesInput, { target: { value: "January 2027 (7 nights)" } });
    fireEvent.change(messageInput, {
      target: { value: "Interested in house reef snorkeling and quiet beach villas." },
    });

    const form = nameInput.closest("form")!;
    fireEvent.submit(form);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Consent is required before your enquiry can be sent.",
    );
    expect(nameInput.value).toBe("Nadia Rahman");
    expect(emailInput.value).toBe("nadia@example.com");
    expect(phoneInput.value).toBe("+44 7700 900111");
    expect(datesInput.value).toBe("January 2027 (7 nights)");
    expect(messageInput.value).toBe("Interested in house reef snorkeling and quiet beach villas.");
  });
});

describe("Phase 1 — Contact settings RBAC & Audit logging (F-09)", () => {
  const sampleSettings: ContactSettings = {
    ...DEFAULT_CONTACT_SETTINGS,
    whatsappEnabled: true,
    whatsappNumber: "+960 700 1111",
    email: "enquiries@example.com",
  };

  it("grants setting.manage only to ADMINISTRATOR and not to AUDITOR or CONSULTANT", () => {
    expect(roleHasPermission("ADMINISTRATOR", "setting.manage")).toBe(true);
    expect(roleHasPermission("AUDITOR", "setting.manage")).toBe(false);
    expect(roleHasPermission("CONSULTANT", "setting.manage")).toBe(false);
    expect(roleHasPermission("CONTENT_EDITOR", "setting.manage")).toBe(false);
    expect(roleHasPermission("OPERATIONS_MANAGER", "setting.manage")).toBe(false);
  });

  it("rejects unauthenticated users", async () => {
    await expect(saveContactSettings(sampleSettings, null)).rejects.toThrow(ContactAuthError);

    vi.spyOn(authMod, "auth").mockResolvedValue(null as never);
    const res = await saveContactSettingsAction({ success: false }, new FormData());
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Unauthorized/i);
  });

  it("rejects staff users without setting.manage and rejects read-only AUDITOR", async () => {
    vi.spyOn(identityMod, "userHasPermission").mockResolvedValue(false);

    await expect(saveContactSettings(sampleSettings, "consultant-user-id")).rejects.toThrow(
      /cannot manage settings/,
    );
    await expect(saveContactSettings(sampleSettings, "auditor-user-id")).rejects.toThrow(
      /cannot manage settings/,
    );

    vi.spyOn(authMod, "auth").mockResolvedValue({
      user: { id: "auditor-user-id", email: "auditor@example.com", staff: true },
    } as never);
    const res = await saveContactSettingsAction({ success: false }, new FormData());
    expect(res.success).toBe(false);
    expect(res.message).toBe("This account cannot manage settings.");
  });

  it("allows an authorized settings administrator and writes a transactional audit record", async () => {
    vi.spyOn(identityMod, "userHasPermission").mockImplementation(
      async (_uid, perm) => perm === "setting.manage",
    );

    const upsertSpy = vi.fn().mockResolvedValue({});
    const findUniqueSpy = vi.fn().mockResolvedValue({
      value: { ...DEFAULT_CONTACT_SETTINGS },
    });
    vi.spyOn(db, "$transaction").mockImplementation((async (
      fn: (tx: unknown) => Promise<unknown>,
    ) =>
      fn({
        systemSetting: {
          findUnique: findUniqueSpy,
          upsert: upsertSpy,
        },
      })) as never);
    const auditSpy = vi.spyOn(auditMod, "writeAudit").mockResolvedValue("audit-id-1");

    const saved = await saveContactSettings(sampleSettings, "admin-user-id");
    expect(saved.whatsappEnabled).toBe(true);
    expect(saved.whatsappNumber).toBe("+960 700 1111");
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy.mock.calls[0]?.[0]).toMatchObject({
      actorId: "admin-user-id",
      action: "setting.update",
      entityType: "system_setting",
      entityId: "admin-user-id",
      before: { key: SETTINGS_KEY, ...DEFAULT_CONTACT_SETTINGS },
      after: { key: SETTINGS_KEY, ...saved },
    });
  });
});

describe("Phase 1 — Terms, Privacy, Reviews & Public Claims (F-02, F-03.1, F-03.3, F-03.4)", () => {
  it("renders /terms and /privacy with accurate disclosures and no internal or invented legal content", async () => {
    const privacyView = await PrivacyPage();
    const { container: privacyContainer } = render(privacyView);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Notice" })).toBeInTheDocument();
    expect(privacyContainer.textContent).toContain("2026-10-10");
    expect(privacyContainer.textContent).toContain("Allow search analytics");

    const termsView = await TermsPage();
    const { container: termsContainer } = render(termsView);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
    expect(termsContainer.textContent).toContain("Price on request");
    expect(termsContainer.textContent).toContain("not create a reservation");

    for (const text of [privacyContainer.textContent ?? "", termsContainer.textContent ?? ""]) {
      expect(text).not.toMatch(/\bD-\d{3}\b/);
      expect(text).not.toMatch(/\bTODO\b|\bFIXME\b|internal note|\bDecision\b/i);
      expect(text).not.toMatch(/pending|management and legal|legal approval|legal review/i);
      expect(text).not.toMatch(/`|ENQUIRY_CONTACT|me_analytics|me\.[a-z]+\.v1/);
      expect(text).not.toMatch(/governing law|limitation of liability|refund|cancellation/i);
    }
  });

  it("links /register to /terms and /privacy and removes misleading encryption/24-7 claims", async () => {
    const registerView = await RegisterPage({ searchParams: Promise.resolve({}) });
    const { container } = render(registerView);
    const termsLink = screen.getByRole("link", { name: "Terms of Service" });
    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(container.textContent).not.toContain("End-to-End Encrypted");
    expect(container.textContent).not.toContain("24/7 Island Concierge");

    const { container: loginContainer } = render(
      <LoginForm
        registerHref="/register"
        passwordSignInAction={async () => {}}
        requestMagicLinkAction={async () => {}}
      />,
    );
    expect(loginContainer.textContent).not.toContain("End-to-End Encrypted");
    expect(loginContainer.textContent).not.toContain("24/7 Island Concierge");
    expect(loginContainer.textContent).not.toContain("confirmed seaplane vouchers");
  });

  it("hides unconfigured contact details and removes placeholder phones, addresses, airport desks, and 4-hour SLA claims", async () => {
    expect(activeContactChannels(DEFAULT_CONTACT_SETTINGS)).toEqual({
      whatsapp: false,
      messenger: false,
      telegram: false,
      hasMessaging: false,
      email: false,
      phone: false,
      officeHours: false,
      address: false,
      emergencyDesk: false,
      hasDirectDetails: false,
    });

    const { container: widgetContainer } = render(
      <FloatingChatWidget settings={DEFAULT_CONTACT_SETTINGS} />,
    );
    expect(widgetContainer.firstChild).toBeNull();

    vi.spyOn(db.systemSetting, "findUnique").mockResolvedValue(null);
    const contactView = await ContactPage();
    const { container: contactContainer } = render(contactView);
    const text = contactContainer.textContent ?? "";

    expect(text).not.toContain("+960 799 1234");
    expect(text).not.toContain("+960 332 4500");
    expect(text).not.toContain("concierge@xplorer.itnvend.com");
    expect(text).not.toContain("Waterfront Executive Building");
    expect(text).not.toContain("Boduthakurufaanu Magu");
    expect(text).not.toContain("Seaplane Lounge Desk 4B");
    expect(text).not.toContain("Seaplane Terminal Private Desk 4B");
    expect(text).not.toContain("Written Quotes Within 4 Hours");
    expect(text).not.toContain("24/7 Island Concierge");
  });

  it("does not render fabricated fallback customer reviews on the homepage when no eligible reviews exist", async () => {
    vi.spyOn(catalogMod, "listPublishedResorts").mockResolvedValue([]);
    vi.spyOn(catalogMod, "listLeadResortImages").mockResolvedValue(new Map());
    vi.spyOn(db.experience, "findMany").mockResolvedValue([]);
    vi.spyOn(db.article, "findMany").mockResolvedValue([]);
    vi.spyOn(db.mediaLink, "findMany").mockResolvedValue([]);
    vi.spyOn(reviewMod, "listTestimonials").mockResolvedValue([]);

    const homeView = await HomePage();
    const { container } = render(homeView);
    const text = container.textContent ?? "";

    expect(text).not.toContain("Elena & Marcus T.");
    expect(text).not.toContain("David & Claire H.");
    expect(text).not.toContain("Sophia & Liam K.");
    expect(text).not.toContain("Victoria & Alexander M.");
    expect(text).not.toContain("Traveler Stories");
  });

  it("prevents duplicate Maldives Explorer suffixes in page metadata titles", () => {
    const meta = publicMetadata({
      title: "Sign In · Maldives Explorer",
      description: "Sign in",
      path: "/login",
    });
    expect(meta.title).toBe("Sign In");
    expect(loginMetadata.title).toBe("Sign In");
    expect(registerMetadata.title).toBe("Create Account");
    expect(newsletterMetadata.title).toBe("The Island Gazette Newsletter");
    expect(privacyMetadata.title).toBe("Privacy Notice");
    expect(termsMetadata.title).toBe("Terms of Service");
  });

  it("keeps search indexing disabled for /terms, /privacy and robots.txt", () => {
    expect(privacyMetadata.robots).toEqual({ index: false, follow: false });
    expect(termsMetadata.robots).toEqual({ index: false, follow: false });
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});
