import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { openAccount } from "@/modules/customers/service";
import { quoteErrorResponse } from "@/modules/quotes/http";
import { QuoteError, readCustomerQuotePdf } from "@/modules/quotes/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const userId = await requirePortalUser();
    const customer = await openAccount(userId);
    const { id } = await context.params;
    const file = await readCustomerQuotePdf(customer.id, id);
    return new Response(Buffer.from(file.body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof QuoteError) return quoteErrorResponse(error);
    return portalErrorResponse(error);
  }
}
