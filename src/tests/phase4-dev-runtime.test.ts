/**
 * @vitest-environment node
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isExplicitLocalEnvironment } from "@/lib/env/schema";
import { testFixturesAllowed } from "@/modules/discovery/visibility";
import { uatQuickFill } from "@/lib/auth/uat";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const {
  resolveRepoRoot,
  resolveRootEnvPath,
  resolveGeneratedEnvPath,
  resolveDevAuthUrl,
  buildLauncherChildEnv,
  buildDatabaseUrl,
  generatedEnvFileLines,
  writeGeneratedEnvFile,
  isDevTunnelEnabled,
  requirePublicTunnelOrigin,
  resolveTeamBoardDir,
  redactConnectionString,
  redactEnvValue,
  safeLauncherSummary,
  DEFAULT_APP_PORT,
} = await import("../../scripts/lib/dev-runtime");

const {
  OwnedProcessRegistry,
  assertPortFree,
  findFreePort,
  isPortListening,
  spawnOwned,
  stopLauncherResources,
  waitForPortState,
} = await import("../../scripts/lib/dev-lifecycle");

/** Fragments that must never appear as hardcoded launcher paths (not listed in production helpers). */
const FORBIDDEN_PATH_FRAGMENTS = [
  "/home/roon/",
  "Desktop/Grinding/maldivexplorer",
  String.raw`D:\project\MaldviesExplorer`,
  "D:/project/MaldviesExplorer",
];

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("Phase 4 — repository path derivation", () => {
  it("resolves the repo root from import.meta.url without machine-specific homes", () => {
    const resolved = resolveRepoRoot();
    expect(path.normalize(resolved)).toBe(path.normalize(root));
    const synthetic = resolveRepoRoot(new URL("file:///opt/ci/repo/scripts/lib/dev-runtime.ts").href);
    expect(synthetic).toBe(path.resolve("/opt/ci/repo"));
    expect(synthetic.includes("/home/roon")).toBe(false);
    expect(synthetic.includes("Desktop/Grinding")).toBe(false);
    expect(resolved.includes("Desktop/Grinding/maldivexplorer")).toBe(false);
  });

  it("keeps machine-specific absolute paths out of launcher source", () => {
    const launcherSources = [
      readFileSync(path.join(root, "scripts/run-dev.ts"), "utf8"),
      readFileSync(path.join(root, "scripts/lib/dev-runtime.ts"), "utf8"),
      readFileSync(path.join(root, "scripts/start-db.ts"), "utf8"),
    ].join("\n");
    for (const fragment of FORBIDDEN_PATH_FRAGMENTS) {
      expect(launcherSources.includes(fragment)).toBe(false);
    }
    expect(launcherSources.includes("xplorer.itnvend.com")).toBe(false);
  });
});

describe("Phase 4 — .env isolation (filesystem)", () => {
  it("preserves an existing root .env while writing only a generated file", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "me-phase4-env-"));
    tempDirs.push(dir);
    const rootEnv = path.join(dir, ".env");
    const sentinel = "PHASE4_SENTINEL=do-not-overwrite\nOTHER=keep-me\n";
    writeFileSync(rootEnv, sentinel);
    const before = readFileSync(rootEnv);

    const childEnv = buildLauncherChildEnv(
      { APP_ENV: "local" },
      { databaseUrl: buildDatabaseUrl({ port: 54329 }), appPort: 3000, tunnelEnabled: false },
    );
    mkdirSync(path.join(dir, ".data"), { recursive: true });
    const generatedPath = path.join(dir, ".data", "stage1-browser.env");
    writeFileSync(generatedPath, `${generatedEnvFileLines(childEnv).join("\n")}\n`);

    expect(readFileSync(rootEnv).equals(before)).toBe(true);
    expect(readFileSync(rootEnv, "utf8")).toContain("PHASE4_SENTINEL=do-not-overwrite");
    expect(existsSync(generatedPath)).toBe(true);
    expect(readFileSync(generatedPath, "utf8")).toContain("AUTH_URL=http://127.0.0.1:3000");
    expect(readFileSync(generatedPath, "utf8")).not.toContain("xplorer.itnvend.com");
  });

  it("exposes root vs generated paths under the repo without writing the root path from helpers", () => {
    expect(resolveRootEnvPath(root)).toBe(path.join(root, ".env"));
    expect(resolveGeneratedEnvPath(root)).toBe(path.join(root, ".data", "stage1-browser.env"));
  });
});

describe("Phase 4 — AUTH_URL and tunnel opt-in", () => {
  it("defaults AUTH_URL to the local app URL when no tunnel is enabled", () => {
    expect(resolveDevAuthUrl({}, { appPort: DEFAULT_APP_PORT, tunnelEnabled: false })).toBe(
      "http://127.0.0.1:3000",
    );
    const env = buildLauncherChildEnv(
      {},
      { databaseUrl: buildDatabaseUrl(), appPort: 3000, tunnelEnabled: false },
    );
    expect(env.AUTH_URL).toBe("http://127.0.0.1:3000");
    expect(env.AUTH_URL).not.toContain("xplorer.itnvend.com");
  });

  it("respects an explicit AUTH_URL over generated defaults", () => {
    expect(
      resolveDevAuthUrl(
        { AUTH_URL: "http://127.0.0.1:4000" },
        { appPort: 3000, tunnelEnabled: false },
      ),
    ).toBe("http://127.0.0.1:4000");
  });

  it("requires an explicit public URL when tunnel mode is enabled", () => {
    expect(isDevTunnelEnabled({})).toBe(false);
    expect(isDevTunnelEnabled({ ENABLE_DEV_TUNNEL: "true" })).toBe(true);
    expect(isDevTunnelEnabled({ ENABLE_DEV_TUNNEL: "TRUE" })).toBe(false);
    expect(isDevTunnelEnabled({ ENABLE_DEV_TUNNEL: "1" })).toBe(false);

    expect(() => resolveDevAuthUrl({}, { appPort: 3000, tunnelEnabled: true })).toThrow(
      /DEV_TUNNEL_PUBLIC_URL/,
    );

    expect(
      resolveDevAuthUrl(
        { DEV_TUNNEL_PUBLIC_URL: "https://dev-tunnel.example.test" },
        { appPort: 3000, tunnelEnabled: true },
      ),
    ).toBe("https://dev-tunnel.example.test");
  });

  it("rejects loopback and malformed values as public tunnel origins", () => {
    expect(() => requirePublicTunnelOrigin("", "DEV_TUNNEL_PUBLIC_URL")).toThrow(/required/);
    expect(() => requirePublicTunnelOrigin("not-a-url", "DEV_TUNNEL_PUBLIC_URL")).toThrow(
      /malformed/,
    );
    expect(() =>
      requirePublicTunnelOrigin("http://127.0.0.1:3000", "DEV_TUNNEL_PUBLIC_URL"),
    ).toThrow(/loopback/);
    expect(() =>
      requirePublicTunnelOrigin("http://localhost:3000", "AUTH_URL"),
    ).toThrow(/loopback/);
    expect(() =>
      resolveDevAuthUrl(
        { AUTH_URL: "http://127.0.0.1:3000" },
        { appPort: 3000, tunnelEnabled: true },
      ),
    ).toThrow(/loopback|public/);
  });

  it("does not invent a production domain for tunnel mode", () => {
    const env = buildLauncherChildEnv(
      {
        ENABLE_DEV_TUNNEL: "true",
        DEV_TUNNEL_PUBLIC_URL: "https://dev-tunnel.example.test",
      },
      { databaseUrl: buildDatabaseUrl(), appPort: 3000, tunnelEnabled: true },
    );
    expect(env.AUTH_URL).toBe("https://dev-tunnel.example.test");
    expect(env.AUTH_URL).not.toMatch(/itnvend\.com/);
  });
});

describe("Phase 4 — Team Board path", () => {
  it("skips Team Board unless ME_TEAM_BOARD_DIR / DEV_TEAM_BOARD_DIR is set", () => {
    expect(resolveTeamBoardDir(root, {})).toBeNull();
    expect(resolveTeamBoardDir(root, { ME_TEAM_BOARD_DIR: "sibling-board" })).toBe(
      path.resolve(root, "sibling-board"),
    );
  });
});

describe("Phase 4 — secret hygiene", () => {
  it("redacts database credentials and seed passwords from log helpers", () => {
    const url = buildDatabaseUrl({ password: "password" });
    expect(redactConnectionString(url)).not.toContain("password");
    expect(redactConnectionString(url)).toContain("***");
    expect(redactEnvValue("SEED_ADMIN_PASSWORD", "AdminPassword123!")).toBe("[redacted]");
    expect(redactEnvValue("AUTH_SECRET", "stage-1-browser-secret-with-32-characters-min")).toBe(
      "[redacted]",
    );
    expect(redactEnvValue("APP_ENV", "local")).toBe("local");

    const summary = safeLauncherSummary({
      appPort: 3000,
      dbPort: 54329,
      authUrl: "http://127.0.0.1:3000",
      tunnelEnabled: false,
      teamBoardDir: null,
      fixturesEnabled: false,
      uatEnabled: false,
    });
    expect(JSON.stringify(summary)).not.toContain("AdminPassword");
    expect(JSON.stringify(summary)).not.toContain("password");
  });
});

describe("Phase 4 — Phase 2 fail-closed gates remain intact", () => {
  it("keeps ALLOW_TEST_FIXTURES and UAT fail-closed when APP_ENV is unset", () => {
    expect(isExplicitLocalEnvironment({})).toBe(false);
    expect(isExplicitLocalEnvironment({ APP_ENV: "" })).toBe(false);
    expect(isExplicitLocalEnvironment({ APP_ENV: "Local" })).toBe(false);
    expect(isExplicitLocalEnvironment({ APP_ENV: "production" })).toBe(false);
    expect(isExplicitLocalEnvironment({ APP_ENV: "local" })).toBe(true);

    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true" })).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: "staging" })).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: "production" })).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: "preview" })).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: "local" })).toBe(true);

    expect(uatQuickFill({ ENABLE_UAT_QUICK_FILL: "true" })).toBeNull();
    expect(
      uatQuickFill({
        ENABLE_UAT_QUICK_FILL: "true",
        APP_ENV: "staging",
        SEED_ADMIN_EMAIL: "a@example.com",
        SEED_ADMIN_PASSWORD: "x",
      }),
    ).toBeNull();
    expect(
      uatQuickFill({
        ENABLE_UAT_QUICK_FILL: "true",
        APP_ENV: "local",
        SEED_ADMIN_EMAIL: "a@example.com",
        SEED_ADMIN_PASSWORD: "x",
      }),
    ).toEqual({ email: "a@example.com", password: "x" });
  });

  it("does not enable fixture or UAT flags inside the launcher child env by default", () => {
    const env = buildLauncherChildEnv(
      {},
      { databaseUrl: buildDatabaseUrl(), appPort: 3000, tunnelEnabled: false },
    );
    expect(env.ALLOW_TEST_FIXTURES).toBeUndefined();
    expect(env.ENABLE_UAT_QUICK_FILL).toBeUndefined();
  });
});

describe("Phase 4 — database URL binding", () => {
  it("builds a loopback DATABASE_URL", () => {
    const url = buildDatabaseUrl({ port: 54329 });
    expect(url).toContain("127.0.0.1:54329");
    expect(url).not.toContain("0.0.0.0");
  });

  it("overrides any process DATABASE_URL with the launcher-owned embedded URL", () => {
    const embedded = buildDatabaseUrl({ port: 54329 });
    const env = buildLauncherChildEnv(
      { DATABASE_URL: "postgresql://other:secret@db.example:5432/elsewhere" },
      { databaseUrl: embedded, appPort: 3000, tunnelEnabled: false },
    );
    expect(env.DATABASE_URL).toBe(embedded);
    expect(env.DATABASE_URL).not.toContain("db.example");
  });
});

describe("Phase 4 — generated env file safety", () => {
  it("writes only under .data with owner-only mode where supported and leaves root .env alone", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "me-phase4-gen-"));
    tempDirs.push(dir);
    const rootEnv = path.join(dir, ".env");
    const sentinel = Buffer.from("PHASE4_SENTINEL=byte-equal\n");
    writeFileSync(rootEnv, sentinel);

    const childEnv = buildLauncherChildEnv(
      {},
      { databaseUrl: buildDatabaseUrl(), appPort: 3000, tunnelEnabled: false },
    );
    const generated = writeGeneratedEnvFile(dir, childEnv);

    expect(generated).toBe(path.join(dir, ".data", "stage1-browser.env"));
    expect(readFileSync(rootEnv).equals(sentinel)).toBe(true);
    expect(readFileSync(generated, "utf8")).toContain("AUTH_URL=http://127.0.0.1:3000");
    expect(readFileSync(generated, "utf8")).not.toContain("xplorer.itnvend.com");

    // `.data/` is comprehensively gitignored in the repository .gitignore.
    const gitignore = readFileSync(path.join(root, ".gitignore"), "utf8");
    expect(gitignore.split(/\r?\n/)).toContain(".data/");
  });
});

describe("Phase 4 — lifecycle integration", () => {
  it("releases a launcher-owned port after SIGTERM cleanup without touching an unrelated listener", async () => {
    const ownedPort = await findFreePort();
    const unrelatedPort = await findFreePort();

    const unrelated = createServer();
    await new Promise<void>((resolve, reject) => {
      unrelated.once("error", reject);
      unrelated.listen(unrelatedPort, "127.0.0.1", () => resolve());
    });

    const registry = new OwnedProcessRegistry();
    const ownedChild = spawnOwned(
      registry,
      process.execPath,
      [
        "-e",
        `require('net').createServer().listen(${ownedPort}, '127.0.0.1', () => console.log('ready'))`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    await waitForPortState(ownedPort, true, { timeoutMs: 8_000 });
    expect(await isPortListening(unrelatedPort)).toBe(true);

    await stopLauncherResources({ registry, signal: "SIGTERM" });
    await waitForPortState(ownedPort, false, { timeoutMs: 8_000 });

    // Signal-killed children may report null exitCode with a non-null signalCode.
    expect(ownedChild.exitCode !== null || ownedChild.signalCode !== null).toBe(true);
    expect(registry.list()).not.toContain(ownedChild);
    expect(await isPortListening(unrelatedPort)).toBe(true);
    expect(await isPortListening(ownedPort)).toBe(false);

    await new Promise<void>((resolve) => unrelated.close(() => resolve()));
  });

  it("handles SIGINT-equivalent cleanup of registry-owned children", async () => {
    const port = await findFreePort();
    const registry = new OwnedProcessRegistry();
    spawnOwned(
      registry,
      process.execPath,
      [
        "-e",
        `require('net').createServer().listen(${port}, '127.0.0.1'); process.on('SIGINT', () => process.exit(0));`,
      ],
      { stdio: "ignore" },
    );
    await waitForPortState(port, true, { timeoutMs: 8_000 });
    await stopLauncherResources({ registry, signal: "SIGINT" });
    await waitForPortState(port, false, { timeoutMs: 8_000 });
  });

  it("cleans owned children after a partial startup failure simulation", async () => {
    const port = await findFreePort();
    const registry = new OwnedProcessRegistry();
    let resourceStopped = false;

    spawnOwned(
      registry,
      process.execPath,
      [
        "-e",
        `require('net').createServer().listen(${port}, '127.0.0.1', () => console.log('child-up'))`,
      ],
      { stdio: "ignore" },
    );
    await waitForPortState(port, true, { timeoutMs: 8_000 });

    // Simulate failure after a child started: stop resources then fail the "startup".
    await stopLauncherResources({
      registry,
      resources: [
        {
          stop: async () => {
            resourceStopped = true;
          },
        },
      ],
      signal: "SIGTERM",
    });
    await waitForPortState(port, false, { timeoutMs: 8_000 });
    expect(resourceStopped).toBe(true);
  });

  it("refuses to bind an already-used port without killing the occupant", async () => {
    const port = await findFreePort();
    const occupant = createServer();
    await new Promise<void>((resolve, reject) => {
      occupant.once("error", reject);
      occupant.listen(port, "127.0.0.1", () => resolve());
    });

    await expect(assertPortFree(port, "Next.js")).rejects.toThrow(/already in use/);
    expect(await isPortListening(port)).toBe(true);

    await new Promise<void>((resolve) => occupant.close(() => resolve()));
  });

  it("preserves root .env bytes across generated write during a cleanup-shaped sequence", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "me-phase4-life-env-"));
    tempDirs.push(dir);
    const rootEnv = path.join(dir, ".env");
    const before = Buffer.from("PHASE4_SENTINEL=lifecycle\nKEEP=1\n");
    writeFileSync(rootEnv, before);

    const childEnv = buildLauncherChildEnv(
      {},
      { databaseUrl: buildDatabaseUrl(), appPort: 3000, tunnelEnabled: false },
    );
    writeGeneratedEnvFile(dir, childEnv);

    expect(readFileSync(rootEnv).equals(before)).toBe(true);
    expect(existsSync(path.join(dir, ".data", "stage1-browser.env"))).toBe(true);
  });
});
