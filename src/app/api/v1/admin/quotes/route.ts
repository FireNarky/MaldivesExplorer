import { NextResponse } from "next/server";
import { quoteErrorResponse, requireStaffUser } from "@/modules/quotes/http";
import { createQuoteSchema } from "@/modules/quotes/schemas";
import { createQuote, listQuotes } from "@/modules/quotes/service";

export async function GET() {
  try {
    const userId = await requireStaffUser();
    const quotes = await listQuotes(userId);
    return NextResponse.json({ quotes });
  } catch (error) {
    return quoteErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireStaffUser();
    const body = createQuoteSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ message: "Choose an enquiry." }, { status: 400 });
    }
    const quote = await createQuote(userId, body.data.reference);
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    return quoteErrorResponse(error);
  }
}
