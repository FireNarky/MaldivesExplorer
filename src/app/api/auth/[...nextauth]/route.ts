import type { NextRequest } from "next/server";
import { authHandlers } from "@/auth";

function unavailable(): Response {
  return Response.json({ error: "Authentication is not configured." }, { status: 503 });
}

export function GET(request: NextRequest): Promise<Response> {
  const handlers = authHandlers();
  if (!handlers) return Promise.resolve(unavailable());
  return handlers.GET(request);
}

export function POST(request: NextRequest): Promise<Response> {
  const handlers = authHandlers();
  if (!handlers) return Promise.resolve(unavailable());
  return handlers.POST(request);
}
