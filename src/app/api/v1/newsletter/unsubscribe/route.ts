import { NextResponse } from "next/server";
import { logError } from "@/lib/observability/log";
import { NewsletterError, subscriptionIdFromToken, unsubscribeNewsletter } from "@/modules/newsletter/service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const id = subscriptionIdFromToken(token);
    if (!id) return NextResponse.json({ message: "This link is not valid." }, { status: 404 });
    await unsubscribeNewsletter(id);
    return NextResponse.json({ status: "UNSUBSCRIBED" });
  } catch (error) {
    if (error instanceof NewsletterError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    logError(error instanceof Error ? error.message : "The subscription could not be updated.");
    return NextResponse.json({ message: "The subscription could not be updated." }, { status: 500 });
  }
}
