const stagingRequired = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_ALLOWLIST",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
] as const;

export function stagingBlockers(
  source: Record<string, string | undefined> = process.env,
): string[] {
  const env = source.APP_ENV?.trim();
  if (env !== "staging" && env !== "production") return [];
  const missing: string[] = [];
  if (source.RATE_LIMIT_STORE?.trim() === "memory") {
    missing.push("RATE_LIMIT_STORE must not be memory");
  }
  if (source.MEDIA_STORAGE?.trim() !== "r2") missing.push("MEDIA_STORAGE=r2");
  if (source.EMAIL_PROVIDER?.trim() !== "resend") missing.push("EMAIL_PROVIDER=resend");
  for (const key of stagingRequired) {
    if (!source[key]?.trim()) missing.push(key);
  }
  return missing;
}

export async function register(): Promise<void> {
  const missing = stagingBlockers();
  if (missing.length === 0) return;
  throw new Error(`Staging startup blocked. Missing: ${missing.join(", ")}.`);
}
