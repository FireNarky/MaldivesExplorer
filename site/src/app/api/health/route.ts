import { healthPayload } from "@/lib/health";

export function GET(): Response {
  return Response.json(healthPayload());
}
