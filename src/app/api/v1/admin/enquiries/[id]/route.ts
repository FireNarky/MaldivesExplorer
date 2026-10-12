import { NextResponse } from "next/server";
import { crmErrorResponse, requireStaffUser } from "@/modules/crm/http";
import { changeStatus } from "@/modules/crm/service";
import { statusPatchSchema } from "@/modules/crm/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const userId = await requireStaffUser();
    const { id } = await context.params;
    const parsed = statusPatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Check the status details." }, { status: 400 });
    }
    await changeStatus(userId, { id }, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
