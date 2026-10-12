import { NextResponse } from "next/server";
import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { listSavedItems } from "@/modules/wishlist/service";

export async function GET() {
  try {
    const userId = await requirePortalUser();
    const items = await listSavedItems(userId);
    return NextResponse.json({
      items: items.map((item) => ({
        id: item.savedItemId,
        entityType: item.entityType,
        entityId: item.entityId,
        name: item.available ? item.name : null,
        href: item.href,
        note: item.note,
        available: item.available,
      })),
    });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
