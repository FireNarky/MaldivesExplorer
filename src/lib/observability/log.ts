import { scrubMessage } from "@/lib/observability/scrub";
import { captureError } from "@/lib/observability/sentry";

export function logInfo(message: string): void {
  console.info(scrubMessage(message));
}

export function logError(message: string, correlationId?: string): void {
  const safe = scrubMessage(message);
  console.error(safe);
  void captureError(safe, correlationId);
}
