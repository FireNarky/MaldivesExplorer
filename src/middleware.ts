import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const redirectStatuses = new Set([301, 302, 307, 308]);

export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const correlationId = headers.get("x-correlation-id") ?? crypto.randomUUID();
  headers.set("x-correlation-id", correlationId);
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
          const redirect = NextResponse.redirect(new URL(body.to, request.url), status);
          redirect.headers.set("x-correlation-id", correlationId);
          return redirect;
        }
      }
    } catch {
      // A lookup failure leaves the requested page in place.
    }
  }
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-correlation-id", correlationId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
