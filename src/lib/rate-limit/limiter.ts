import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): Promise<boolean>;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  async consume(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < windowMs);
    recent.push(now);
    this.hits.set(key, recent);
    return recent.length <= limit;
  }

  clear(): void {
    this.hits.clear();
  }
}

export class DatabaseRateLimiter implements RateLimiter {
  async consume(key: string, limit: number, windowMs: number): Promise<boolean> {
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
    const bucketKey = createHash("sha256").update(key).digest("hex");
    const rows = await db.$queryRaw<Array<{ hits: number }>>`
      INSERT INTO rate_limit_buckets (bucket_key, window_start, hits)
      VALUES (${bucketKey}, ${windowStart}, 1)
      ON CONFLICT (bucket_key, window_start)
      DO UPDATE SET hits = rate_limit_buckets.hits + 1
      RETURNING hits
    `;
    return (rows[0]?.hits ?? limit + 1) <= limit;
  }
}

const memory = new MemoryRateLimiter();

export function resetMemoryRateLimiter(): void {
  memory.clear();
}

export function rateLimiter(): RateLimiter {
  const env = process.env.APP_ENV;
  const choice = process.env.RATE_LIMIT_STORE?.trim();
  if (env === "staging" || env === "production") {
    if (choice === "memory") {
      throw new Error("Memory rate limiting is not allowed in staging or production.");
    }
    return new DatabaseRateLimiter();
  }
  if (choice === "database") return new DatabaseRateLimiter();
  return memory;
}
