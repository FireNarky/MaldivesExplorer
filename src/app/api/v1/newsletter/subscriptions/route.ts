import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { botProtection } from "@/lib/bot/protection";
import { logError } from "@/lib/observability/log";
import { NewsletterError, subscribeNewsletter } from "@/modules/newsletter/service";
import { newsletterLimited } from "@/modules/newsletter/rules";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const ipHash = createHash("sha256").update(ip).digest("hex");
    if (await newsletterLimited(ipHash)) {
      return NextResponse.json({ message: "Try again later." }, { status: 429 });
    }
    const body = (await request.json()) as {
      email?: unknown;
      consent?: unknown;
      noticeVersion?: unknown;
      topics?: unknown;
      website?: unknown;
      turnstileToken?: unknown;
    };
    const token = typeof body.turnstileToken === "string" ? body.turnstileToken : null;
    if (!(await botProtection().verify(token, ip))) {
      return NextResponse.json(
        { message: "The subscription could not be saved." },
        { status: 400 },
      );
    }
    const session = await auth().catch(() => null);
    const result = await subscribeNewsletter({
      email: typeof body.email === "string" ? body.email : "",
      consent: body.consent === true,
      noticeVersion: typeof body.noticeVersion === "string" ? body.noticeVersion : "",
      topics: Array.isArray(body.topics)
        ? body.topics.filter((item): item is string => typeof item === "string")
        : [],
      source: "newsletter-form",
      ipHash,
      idempotencyKey: request.headers.get("idempotency-key") ?? "",
      actorId: session?.user?.id || null,
      website: typeof body.website === "string" ? body.website : "",
      replaceTopics: Array.isArray(body.topics),
    });
    return NextResponse.json(
      { id: result.id, status: result.status, stored: result.stored },
      { status: result.replayed || result.status !== "CONFIRMED" ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof NewsletterError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    logError(error instanceof Error ? error.message : "The subscription could not be saved.");
    return NextResponse.json({ message: "The subscription could not be saved." }, { status: 500 });
  }
}
