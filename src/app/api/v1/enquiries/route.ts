import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { draftFrom } from "@/lib/planner/local";
import { logError } from "@/lib/observability/log";
import { recordProductEvent } from "@/modules/analytics/service";
import { EnquiryError, submitEnquiry } from "@/modules/enquiries/service";
import { consentFromCookie } from "@/modules/search/query";

const hits = new Map<string, number[]>();

function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 20;
}

async function turnstileFailed(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return false;
  if (!token) return true;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  if (!response.ok) return true;
  const payload = (await response.json()) as { success?: boolean };
  return payload.success !== true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const ipHash = createHash("sha256").update(ip).digest("hex");
    if (limited(ipHash)) {
      return NextResponse.json({ message: "Try again later." }, { status: 429 });
    }
    const body = (await request.json()) as { website?: unknown; turnstileToken?: unknown };
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ message: "The plan could not be submitted." }, { status: 400 });
    }
    if (await turnstileFailed(typeof body.turnstileToken === "string" ? body.turnstileToken : "")) {
      return NextResponse.json({ message: "The plan could not be submitted." }, { status: 400 });
    }
    const draft = draftFrom(body);
    if (!draft) {
      return NextResponse.json({ message: "Check the plan." }, { status: 400 });
    }
    const session = await auth().catch(() => null);
    const result = await submitEnquiry(draft, {
      userId: session?.user?.id || null,
      ipHash,
      idempotencyKey: request.headers.get("idempotency-key") ?? "",
    });
    const consent = consentFromCookie(
      request.headers
        .get("cookie")
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("me_analytics="))
        ?.slice("me_analytics=".length),
    );
    await recordProductEvent({
      name: "enquiry_submitted",
      consent,
      userId: session?.user?.id,
      properties: { created: result.created },
    });
    await recordProductEvent({
      name: "planner_step_completed",
      consent,
      userId: session?.user?.id,
      properties: { step: "review" },
    });
    return NextResponse.json(
      { reference: result.reference, duplicate: result.duplicate, missing: result.missing },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof EnquiryError) {
      return NextResponse.json(
        { message: error.message, errors: error.fields },
        { status: error.status },
      );
    }
    logError(error instanceof Error ? error.message : "The plan could not be submitted.");
    return NextResponse.json({ message: "The plan could not be submitted." }, { status: 500 });
  }
}
