import { NextResponse } from "next/server";
import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { openAccount } from "@/modules/customers/service";
import { quoteErrorResponse } from "@/modules/quotes/http";
import { quoteResponseSchema } from "@/modules/quotes/schemas";
import { QuoteError, respondToQuoteVersion } from "@/modules/quotes/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const userId = await requirePortalUser();
    const customer = await openAccount(userId);
    const { id } = await context.params;
    const body = quoteResponseSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ message: "Choose a response." }, { status: 400 });
    }
    const result = await respondToQuoteVersion({
      customerId: customer.id,
      actorId: userId,
      versionId: id,
      responseType: body.data.responseType,
      message: body.data.message ?? "",
      idempotencyKey: request.headers.get("idempotency-key") ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QuoteError) return quoteErrorResponse(error);
    return portalErrorResponse(error);
  }
}
