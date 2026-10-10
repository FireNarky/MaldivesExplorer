import { describe, expect, it } from "vitest";
import { parseAppEnv } from "@/lib/env/schema";

describe("parseAppEnv", () => {
  it("defaults a blank environment to local", () => {
    expect(parseAppEnv({ APP_ENV: " " }).APP_ENV).toBe("local");
  });

  it("rejects an unknown environment name", () => {
    expect(() => parseAppEnv({ APP_ENV: "dev" })).toThrow();
  });

  it("does not require database or auth values to boot", () => {
    const env = parseAppEnv({});
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.AUTH_SECRET).toBeUndefined();
    expect(env.AUTH_URL).toBeUndefined();
  });
});
