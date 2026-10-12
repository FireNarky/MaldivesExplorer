import { NextResponse } from "next/server";
import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { readOwnQuote } from "@/modules/customers/records";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const userId = await requirePortalUser();
    const { id } = await context.params;
    const quote = await readOwnQuote(userId, id);
    if (!quote)
      return NextResponse.json({ message: "That record is not available." }, { status: 404 });
    return NextResponse.json({ quote });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
