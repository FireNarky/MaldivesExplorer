import { scrubMessage } from "@/lib/observability/scrub";

type SentryTarget = { key: string; storeUrl: string };

export function sentryTarget(dsn = process.env.SENTRY_DSN?.trim()): SentryTarget | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const key = url.username;
    const project = url.pathname.replace(/^\//, "");
    if (!key || !project) return null;
    return { key, storeUrl: `${url.protocol}//${url.host}/api/${project}/store/` };
  } catch {
    return null;
  }
}

export async function captureError(message: string, correlationId?: string): Promise<void> {
  const target = sentryTarget();
  if (!target) return;
  const event = {
    message: scrubMessage(message),
    level: "error",
    platform: "node",
    tags: correlationId ? { correlationId } : undefined,
  };
  await fetch(`${target.storeUrl}?sentry_key=${encodeURIComponent(target.key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => undefined);
}
