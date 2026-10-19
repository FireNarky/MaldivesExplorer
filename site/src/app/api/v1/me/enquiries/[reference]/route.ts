import { NextResponse } from "next/server";
import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { readOwnEnquiry } from "@/modules/customers/records";

type Context = { params: Promise<{ reference: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const userId = await requirePortalUser();
    const { reference } = await context.params;
    const enquiry = await readOwnEnquiry(userId, reference);
    if (!enquiry)
      return NextResponse.json({ message: "That record is not available." }, { status: 404 });
    return NextResponse.json({ enquiry });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
