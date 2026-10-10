import { describe, expect, it } from "vitest";
import { healthPayload } from "@/lib/health";

describe("GET /api/health", () => {
  it("returns only the public fields", () => {
    const body = healthPayload({
      APP_ENV: "local",
      DATABASE_URL: "postgres://user:password@db.internal:5432/app",
      AUTH_SECRET: "super-secret-value",
      AUTH_URL: "http://127.0.0.1:3000",
    });

    expect(Object.keys(body).sort()).toEqual(["application", "environment", "status", "version"]);
    expect(body).toMatchObject({
      status: "ok",
      application: "Maldives Explorer",
      environment: "local",
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("postgres");
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("db.internal");
  });
});
