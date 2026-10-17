import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { botProtection } from "@/lib/bot/protection";
import { draftFrom } from "@/lib/planner/local";
import { logError } from "@/lib/observability/log";
import { rateLimiter } from "@/lib/rate-limit/limiter";
import { recordProductEvent } from "@/modules/analytics/service";
import { EnquiryError, submitEnquiry } from "@/modules/enquiries/service";
import { consentFromCookie } from "@/modules/search/query";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const ipHash = createHash("sha256").update(ip).digest("hex");
    if (!(await rateLimiter().consume(`enquiry:${ipHash}`, 20, 60 * 60 * 1000))) {
      return NextResponse.json({ message: "Try again later." }, { status: 429 });
    }
    const body = (await request.json()) as { website?: unknown; turnstileToken?: unknown };
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ message: "The plan could not be submitted." }, { status: 400 });
    }
    const token = typeof body.turnstileToken === "string" ? body.turnstileToken : null;
    if (!(await botProtection().verify(token, ip))) {
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
    try {
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
    } catch (error) {
      logError(error instanceof Error ? error.message : "The plan event could not be stored.");
    }
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
