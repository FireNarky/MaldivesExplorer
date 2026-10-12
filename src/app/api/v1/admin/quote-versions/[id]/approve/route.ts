import { NextResponse } from "next/server";
import { quoteErrorResponse, requireStaffUser } from "@/modules/quotes/http";
import { approveVersion } from "@/modules/quotes/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const userId = await requireStaffUser();
    const { id } = await context.params;
    const result = await approveVersion(userId, id);
    return NextResponse.json(result);
  } catch (error) {
    return quoteErrorResponse(error);
  }
}
