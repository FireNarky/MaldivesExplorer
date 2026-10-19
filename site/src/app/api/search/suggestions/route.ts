import { NextResponse } from "next/server";
import { suggestPublished } from "@/modules/search/service";
import { normalizeSearchQuery } from "@/modules/search/query";
import { logError } from "@/lib/observability/log";

export async function GET(request: Request) {
  const query = normalizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "");
  try {
    const suggestions = await suggestPublished(query);
    return Response.json({ suggestions });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Search suggestions could not be loaded.");
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
