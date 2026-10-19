import { NextResponse } from "next/server";
import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { listOwnEnquiries } from "@/modules/customers/records";

export async function GET() {
  try {
    const userId = await requirePortalUser();
    return NextResponse.json({ enquiries: await listOwnEnquiries(userId) });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
