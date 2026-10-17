import { describe, expect, it } from "vitest";
import { DisabledEmailProvider } from "@/lib/email/provider";
import { stagingBlockers } from "@/instrumentation";
import { MemoryRateLimiter } from "@/lib/rate-limit/limiter";
import { scrub, scrubMessage } from "@/lib/observability/scrub";
import { assertStorageKey } from "@/modules/media/storage";

describe("staging controls", () => {
  it("keeps a bearer token out of a scrubbed message", () => {
    expect(scrubMessage("link /register?claim=abcDEF123")).toBe("link /register?claim=[redacted]");
    expect(scrub({ claimUrl: "/register?claim=abc", note: "hello" })).toEqual({
      claimUrl: "[redacted]",
      note: "hello",
    });
  });

  it("rejects a storage key that leaves the bucket prefix", () => {
    expect(() => assertStorageKey("../secret")).toThrow(/not allowed/);
    expect(() => assertStorageKey("guest@example.com/file")).toThrow(/not allowed/);
    expect(() => assertStorageKey("quotes/11111111-1111-4111-8111-111111111111.pdf")).not.toThrow();
  });

  it("does not accept mail from the disabled provider", async () => {
    const result = await new DisabledEmailProvider().send({
      to: "guest@example.com",
      subject: "Hello",
      text: "Body",
      idempotencyKey: "test",
    });
    expect(result.accepted).toBe(false);
  });

  it("counts requests in the memory limiter", async () => {
    const limiter = new MemoryRateLimiter();
    expect(await limiter.consume("sign-in", 1, 1000)).toBe(true);
    expect(await limiter.consume("sign-in", 1, 1000)).toBe(false);
  });

  it("blocks staging startup until the shared services are configured", () => {
    expect(stagingBlockers({ APP_ENV: "local" })).toEqual([]);
    expect(
      stagingBlockers({ APP_ENV: "staging", RATE_LIMIT_STORE: "memory" }).length,
    ).toBeGreaterThan(0);
    expect(
      stagingBlockers({
        APP_ENV: "staging",
        DATABASE_URL: "postgresql://example",
        AUTH_SECRET: "stage-secret-with-32-characters-minimum",
        RESEND_API_KEY: "key",
        EMAIL_FROM: "stage@example.com",
        EMAIL_ALLOWLIST: "stage@example.com",
        EMAIL_PROVIDER: "resend",
        MEDIA_STORAGE: "r2",
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "staging",
        TURNSTILE_SECRET_KEY: "secret",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site",
      }),
    ).toEqual([]);
  });
});
