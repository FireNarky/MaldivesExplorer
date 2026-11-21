import { NextResponse } from "next/server";
import { findActiveRedirect } from "@/modules/redirects/service";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "";
  try {
    const row = await findActiveRedirect(path);
    if (!row || row.toPath === path) return new NextResponse(null, { status: 204 });
    if (
      row.statusCode !== 301 &&
      row.statusCode !== 302 &&
      row.statusCode !== 307 &&
      row.statusCode !== 308
    ) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json({ to: row.toPath, status: row.statusCode });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
