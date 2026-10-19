import { NextResponse } from "next/server";
import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { requestPrivacy } from "@/modules/customers/service";

export async function POST() {
  try {
    const userId = await requirePortalUser();
    await requestPrivacy(userId, "deletion");
    return NextResponse.json({ recorded: true }, { status: 202 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
