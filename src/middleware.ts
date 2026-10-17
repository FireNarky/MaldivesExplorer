import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const redirectStatuses = new Set([301, 302, 307, 308]);

export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  headers.set("x-search", request.nextUrl.search);
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/internal/redirects")) {
    try {
      const lookup = new URL("/api/internal/redirects", request.url);
      lookup.searchParams.set("path", path);
      const response = await fetch(lookup);
      if (response.ok) {
        const body = (await response.json()) as { to?: unknown; status?: unknown };
        const status = body.status;
        if (
          typeof body.to === "string" &&
          body.to.startsWith("/") &&
          !body.to.includes("//") &&
          typeof status === "number" &&
          redirectStatuses.has(status)
        ) {
          return NextResponse.redirect(new URL(body.to, request.url), status);
        }
      }
    } catch {
      // A lookup failure leaves the requested page in place.
    }
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
