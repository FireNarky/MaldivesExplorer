import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CrmError } from "@/modules/crm/service";

export async function requireStaffUser(): Promise<string> {
  const session = await auth().catch(() => null);
  const id = session?.user?.id || "";
  if (!id || !session?.user?.staff) throw new CrmError("Sign in to continue.", 401);
  return id;
}

export function crmErrorResponse(error: unknown): NextResponse {
  if (error instanceof CrmError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return NextResponse.json({ message: "The enquiry could not be saved." }, { status: 500 });
}
