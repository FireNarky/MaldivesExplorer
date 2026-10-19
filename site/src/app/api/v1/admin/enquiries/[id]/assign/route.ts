import { NextResponse } from "next/server";
import { crmErrorResponse, requireStaffUser } from "@/modules/crm/http";
import { assignEnquiry } from "@/modules/crm/service";
import { assignSchema } from "@/modules/crm/schemas";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const userId = await requireStaffUser();
    const { id } = await context.params;
    const parsed = assignSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Check the assignment details." }, { status: 400 });
    }
    await assignEnquiry(userId, { id }, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
