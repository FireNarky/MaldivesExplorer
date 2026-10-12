import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PortalError } from "@/modules/customers/service";

export async function requirePortalUser(): Promise<string> {
  const session = await auth().catch(() => null);
  const id = session?.user?.id || "";
  if (!id) throw new PortalError("Sign in to continue.", 401);
  return id;
}

export function portalErrorResponse(error: unknown): NextResponse {
  if (error instanceof PortalError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return NextResponse.json({ message: "The account could not be opened." }, { status: 500 });
}
