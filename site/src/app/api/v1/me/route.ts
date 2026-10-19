import { NextResponse } from "next/server";
import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { isPortalConsentPurpose } from "@/modules/customers/rules";
import { readConsent, readProfile, saveConsent, updateProfile } from "@/modules/customers/service";

export async function GET() {
  try {
    const userId = await requirePortalUser();
    const [profile, consent] = await Promise.all([readProfile(userId), readConsent(userId)]);
    return NextResponse.json({ profile, consent });
  } catch (error) {
    return portalErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requirePortalUser();
    const body = (await request.json()) as {
      name?: unknown;
      phone?: unknown;
      countryCode?: unknown;
      locale?: unknown;
      consent?: unknown;
    };
    const patch: { name?: string; phone?: string; countryCode?: string; locale?: string } = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.phone === "string") patch.phone = body.phone;
    if (typeof body.countryCode === "string") patch.countryCode = body.countryCode;
    if (typeof body.locale === "string") patch.locale = body.locale;
    if (Object.keys(patch).length > 0) await updateProfile(userId, patch);
    if (body.consent && typeof body.consent === "object" && !Array.isArray(body.consent)) {
      const updates: Partial<
        Record<"ACCOUNT" | "ENQUIRY_CONTACT" | "ANALYTICS" | "MARKETING", boolean>
      > = {};
      for (const [key, value] of Object.entries(body.consent)) {
        if (isPortalConsentPurpose(key) && typeof value === "boolean") updates[key] = value;
      }
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      const { createHash } = await import("node:crypto");
      await saveConsent(userId, updates, createHash("sha256").update(ip).digest("hex"));
    }
    const [profile, consent] = await Promise.all([readProfile(userId), readConsent(userId)]);
    return NextResponse.json({ profile, consent });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
