import { NextResponse } from "next/server";
import { logError } from "@/lib/observability/log";
import { resolvePublicItems } from "@/modules/wishlist/service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: unknown };
    const items = Array.isArray(body.items) ? body.items : [];
    const parsed = items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as { entityType?: unknown; entityId?: unknown };
      if (typeof record.entityType !== "string" || typeof record.entityId !== "string") return [];
      return [{ entityType: record.entityType, entityId: record.entityId }];
    });
    const resolved = await resolvePublicItems(parsed);
    return Response.json({ items: resolved });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Saved listings could not be resolved.");
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
