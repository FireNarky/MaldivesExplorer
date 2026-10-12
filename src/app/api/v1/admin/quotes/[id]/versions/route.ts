import { NextResponse } from "next/server";
import { quoteErrorResponse, requireStaffUser } from "@/modules/quotes/http";
import { createNextVersion } from "@/modules/quotes/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const userId = await requireStaffUser();
    const { id } = await context.params;
    const version = await createNextVersion(userId, id);
    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    return quoteErrorResponse(error);
  }
}
