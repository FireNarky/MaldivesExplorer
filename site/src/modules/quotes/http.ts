import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { QuoteError } from "@/modules/quotes/service";

export async function requireStaffUser(): Promise<string> {
  const session = await auth().catch(() => null);
  const id = session?.user?.id || "";
  if (!id || !session?.user?.staff) throw new QuoteError("Sign in to continue.", 401);
  return id;
}

export function quoteErrorResponse(error: unknown): NextResponse {
  if (error instanceof QuoteError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return NextResponse.json({ message: "The quote could not be saved." }, { status: 500 });
}
