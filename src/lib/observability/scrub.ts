const secretKey = /password|secret|token|authorization|cookie|claim|magic|reset|body|terms/i;

export function scrub(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/claim=[A-Za-z0-9_-]+/g, "claim=[redacted]")
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  }
  if (Array.isArray(value)) return value.map((item) => scrub(item));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = secretKey.test(key) ? "[redacted]" : scrub(item);
    }
    return output;
  }
  return value;
}

export function scrubMessage(message: string): string {
  const cleaned = scrub(message);
  return typeof cleaned === "string" ? cleaned : "An error was recorded.";
}
