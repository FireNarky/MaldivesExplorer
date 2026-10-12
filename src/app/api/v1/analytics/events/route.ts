import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordProductEvent } from "@/modules/analytics/service";
import { consentFromCookie } from "@/modules/search/query";

const hits = new Map<string, number[]>();

function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 60;
}

function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  const found = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : undefined;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  if (limited(ipHash)) return NextResponse.json({ message: "Try again later." }, { status: 429 });
  const body = (await request.json()) as { name?: unknown; properties?: unknown };
  const session = await auth().catch(() => null);
  const properties =
    body.properties && typeof body.properties === "object" && !Array.isArray(body.properties)
      ? (body.properties as Record<string, unknown>)
      : {};
  const stored = await recordProductEvent({
    name: typeof body.name === "string" ? body.name : "",
    consent: consentFromCookie(cookieValue(request.headers.get("cookie"), "me_analytics")),
    anonymousKey: cookieValue(request.headers.get("cookie"), "me_anon"),
    userId: session?.user?.id,
    properties,
  });
  return NextResponse.json({ stored });
}
