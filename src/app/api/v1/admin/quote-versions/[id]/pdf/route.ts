import { quoteErrorResponse, requireStaffUser } from "@/modules/quotes/http";
import { readStaffQuotePdf } from "@/modules/quotes/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const userId = await requireStaffUser();
    const { id } = await context.params;
    const file = await readStaffQuotePdf(userId, id);
    return new Response(Buffer.from(file.body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return quoteErrorResponse(error);
  }
}
