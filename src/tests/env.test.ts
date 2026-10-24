import { describe, expect, it } from "vitest";
import { isExplicitLocalEnvironment, parseAppEnv } from "@/lib/env/schema";

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

describe("isExplicitLocalEnvironment", () => {
  it("is true only for the exact string local", () => {
    expect(isExplicitLocalEnvironment({ APP_ENV: "local" })).toBe(true);
  });

  it("fails closed when APP_ENV is missing, empty, or not exactly local", () => {
    expect(isExplicitLocalEnvironment({})).toBe(false);
    expect(isExplicitLocalEnvironment({ APP_ENV: undefined })).toBe(false);
    expect(isExplicitLocalEnvironment({ APP_ENV: "" })).toBe(false);
    expect(isExplicitLocalEnvironment({ APP_ENV: "   " })).toBe(false);
    for (const appEnv of [
      "production",
      "staging",
      "preview",
      "random",
      "Local",
      "LOCAL",
      " local",
      "local ",
    ]) {
      expect(isExplicitLocalEnvironment({ APP_ENV: appEnv }), appEnv).toBe(false);
    }
  });
});
