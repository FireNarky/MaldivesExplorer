/**
 * Pure configuration helpers for the local development launcher (`scripts/run-dev.ts`).
 * Kept free of process side effects so Phase 4 regression tests can import them safely.
 */

import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_APP_PORT = 3000;
export const DEFAULT_DB_PORT = 54329;
export const DEFAULT_TUNNEL_PROXY_PORT = 3100;
export const DEFAULT_BOARD_PORT = 3200;
export const DEFAULT_DATABASE_NAME = "maldives_stage1";

export type EnvSource = Record<string, string | undefined>;

const SENSITIVE_ENV_KEYS = new Set([
  "AUTH_SECRET",
  "SEED_ADMIN_PASSWORD",
  "DATABASE_URL",
  "AUTH_GOOGLE_SECRET",
  "AUTH_FACEBOOK_SECRET",
  "PASSWORD",
  "POSTGRES_PASSWORD",
]);

/**
 * Repository root derived from this module's location (scripts/lib → repo root).
 * Never uses a developer home directory or machine-specific absolute path.
 */
export function resolveRepoRoot(fromUrl = import.meta.url): string {
  return path.resolve(path.dirname(fileURLToPath(fromUrl)), "..", "..");
}

export function resolvePostgresDataDir(root: string): string {
  return path.join(root, ".data", "postgres");
}

export function resolveGeneratedEnvPath(root: string): string {
  return path.join(root, ".data", "stage1-browser.env");
}

export function resolveRootEnvPath(root: string): string {
  return path.join(root, ".env");
}

/** True only when the value is the string "true" (case-sensitive), matching Phase 2 gates. */
export function isExplicitTrue(value: unknown): boolean {
  return value === "true";
}

/**
 * Tunnel / public exposure must be an explicit opt-in.
 * Uses ENABLE_DEV_TUNNEL=true (same string semantics as ALLOW_TEST_FIXTURES).
 */
export function isDevTunnelEnabled(source: EnvSource = {}): boolean {
  return isExplicitTrue(source.ENABLE_DEV_TUNNEL);
}

/**
 * Optional Team Board directory. Must be provided by the developer; never a hardcoded
 * personal path. Relative paths are resolved against the repository root.
 */
export function resolveTeamBoardDir(root: string, source: EnvSource = {}): string | null {
  const raw = (source.ME_TEAM_BOARD_DIR || source.DEV_TEAM_BOARD_DIR || "").trim();
  if (!raw) return null;
  return path.isAbsolute(raw) ? raw : path.resolve(root, raw);
}

export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";
}

/**
 * Validate a deliberately provided public tunnel origin.
 * Rejects missing, malformed, non-http(s), and loopback values so the generated local AUTH_URL
 * can never be mistaken for an explicit public tunnel origin.
 */
export function requirePublicTunnelOrigin(raw: string, label: string): string {
  const value = raw.trim();
  if (!value) {
    throw new Error(
      `${label} is required when ENABLE_DEV_TUNNEL=true. Provide a public https origin (not loopback). No production domain is assumed.`,
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `${label} must be an absolute URL (for example https://dev.example.test). Received a malformed value.`,
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must use http: or https:. Received ${url.protocol}`);
  }
  if (isLoopbackHostname(url.hostname)) {
    throw new Error(
      `${label} must be a public tunnel origin, not a loopback address (${url.hostname}). Set DEV_TUNNEL_PUBLIC_URL to the external https origin your tunnel forwards.`,
    );
  }
  // Normalize to origin (scheme + host [+ port]) — Auth.js needs a stable base URL.
  return url.origin;
}

/**
 * AUTH_URL for the launcher child environment.
 *
 * Precedence:
 * - Tunnel disabled: explicit AUTH_URL (any valid URL) wins; otherwise http://127.0.0.1:{appPort}.
 * - Tunnel enabled: DEV_TUNNEL_PUBLIC_URL wins when set; otherwise AUTH_URL only if it is a
 *   non-loopback public origin. Never invents a domain and never uses the generated loopback
 *   default as the tunnel AUTH_URL.
 */
export function resolveDevAuthUrl(
  source: EnvSource = {},
  {
    appPort = DEFAULT_APP_PORT,
    tunnelEnabled = false,
  }: { appPort?: number; tunnelEnabled?: boolean } = {},
): string {
  if (tunnelEnabled) {
    const tunnelRaw = (source.DEV_TUNNEL_PUBLIC_URL || "").trim();
    if (tunnelRaw) {
      return requirePublicTunnelOrigin(tunnelRaw, "DEV_TUNNEL_PUBLIC_URL");
    }
    const authRaw = (source.AUTH_URL || "").trim();
    if (authRaw) {
      return requirePublicTunnelOrigin(authRaw, "AUTH_URL");
    }
    throw new Error(
      "ENABLE_DEV_TUNNEL=true requires DEV_TUNNEL_PUBLIC_URL (preferred) or a non-loopback AUTH_URL so Auth.js callbacks match the public host. The local loopback default is not used as a tunnel origin.",
    );
  }

  const explicit = (source.AUTH_URL || "").trim();
  if (explicit) {
    try {
      // Accept developer-provided local or remote URLs when tunnel mode is off.
      new URL(explicit);
    } catch {
      throw new Error("AUTH_URL must be an absolute URL when provided.");
    }
    return explicit;
  }

  return `http://127.0.0.1:${appPort}`;
}

export function buildDatabaseUrl({
  host = "127.0.0.1",
  port = DEFAULT_DB_PORT,
  user = "postgres",
  password = "password",
  database = DEFAULT_DATABASE_NAME,
}: {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
} = {}): string {
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

/**
 * Environment passed to child processes for the embedded local launcher.
 *
 * Per-variable behaviour:
 * - DATABASE_URL: always the launcher-owned embedded URL (overrides any process value).
 * - AUTH_URL: resolveDevAuthUrl (explicit wins when tunnel off; public origin required when tunnel on).
 * - APP_ENV: preserved when already set; otherwise "local".
 * - AUTH_SECRET / SEED_ADMIN_*: preserved when set; otherwise local development defaults.
 * - ALLOW_TEST_FIXTURES / ENABLE_UAT_QUICK_FILL: never set by the launcher (fail-closed unless
 *   already present in processEnv from the developer).
 *
 * The launcher does not read or write root `.env` / `.env.local`; it consumes `process.env` only.
 * Next.js may load dotenv files itself after spawn — that is separate from this helper.
 */
export function buildLauncherChildEnv(
  processEnv: EnvSource = {},
  {
    databaseUrl,
    appPort = DEFAULT_APP_PORT,
    tunnelEnabled = false,
    authSecretFallback = "stage-1-browser-secret-with-32-characters-min",
  }: {
    databaseUrl: string;
    appPort?: number;
    tunnelEnabled?: boolean;
    authSecretFallback?: string;
  },
): EnvSource {
  if (!databaseUrl) throw new Error("databaseUrl is required for the launcher child environment.");

  const authUrl = resolveDevAuthUrl(processEnv, { appPort, tunnelEnabled });

  const child: EnvSource = {
    ...processEnv,
    DATABASE_URL: databaseUrl,
    APP_ENV: processEnv.APP_ENV || "local",
    AUTH_SECRET: processEnv.AUTH_SECRET || authSecretFallback,
    AUTH_URL: authUrl,
    SEED_ADMIN_EMAIL: processEnv.SEED_ADMIN_EMAIL || "browser-admin@example.com",
    SEED_ADMIN_PASSWORD: processEnv.SEED_ADMIN_PASSWORD || "AdminPassword123!",
  };

  // Explicitly do not invent fixture/UAT flags. If the developer already set them, they pass through
  // via ...processEnv above; the launcher never assigns them here.
  return child;
}

/** Lines written only to the generated `.data/stage1-browser.env` file (never root `.env`). */
export function generatedEnvFileLines(childEnv: EnvSource): string[] {
  return [
    `APP_ENV=${childEnv.APP_ENV}`,
    `DATABASE_URL=${childEnv.DATABASE_URL}`,
    `AUTH_SECRET=${childEnv.AUTH_SECRET}`,
    `AUTH_URL=${childEnv.AUTH_URL}`,
    `SEED_ADMIN_EMAIL=${childEnv.SEED_ADMIN_EMAIL}`,
    `SEED_ADMIN_PASSWORD=${childEnv.SEED_ADMIN_PASSWORD}`,
  ];
}

/**
 * Write the generated env file under `.data/` with owner-only permissions where the platform
 * supports POSIX modes. Never writes the repository root `.env`.
 */
export function writeGeneratedEnvFile(root: string, childEnv: EnvSource): string {
  const generatedPath = resolveGeneratedEnvPath(root);
  mkdirSync(path.dirname(generatedPath), { recursive: true });
  writeFileSync(generatedPath, `${generatedEnvFileLines(childEnv).join("\n")}\n`, { encoding: "utf8" });
  try {
    chmodSync(generatedPath, 0o600);
  } catch {
    // Windows and some filesystems may not apply POSIX modes; contents remain gitignored via `.data/`.
  }
  return generatedPath;
}

export function redactConnectionString(value: string): string {
  if (typeof value !== "string" || value.length === 0) return value;
  try {
    const url = new URL(value);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return "[redacted]";
  }
}

export function redactEnvValue(key: string, value: unknown): unknown {
  if (value == null) return value;
  const upper = key.toUpperCase();
  if (SENSITIVE_ENV_KEYS.has(upper) || upper.includes("PASSWORD") || upper.includes("SECRET")) {
    return "[redacted]";
  }
  if (upper === "DATABASE_URL" || upper.endsWith("_DATABASE_URL")) {
    return redactConnectionString(String(value));
  }
  return value;
}

/** Safe summary for console logging (never includes passwords or full connection strings). */
export function safeLauncherSummary({
  appPort,
  dbPort,
  authUrl,
  tunnelEnabled,
  teamBoardDir,
  fixturesEnabled,
  uatEnabled,
  databaseHost = "127.0.0.1",
}: {
  appPort: number;
  dbPort: number;
  authUrl: string;
  tunnelEnabled: boolean;
  teamBoardDir: string | null;
  fixturesEnabled: boolean;
  uatEnabled: boolean;
  databaseHost?: string;
}): Record<string, unknown> {
  return {
    appUrl: `http://127.0.0.1:${appPort}`,
    authUrl,
    databaseHost,
    databasePort: dbPort,
    tunnelEnabled: Boolean(tunnelEnabled),
    teamBoardConfigured: Boolean(teamBoardDir),
    allowTestFixtures: Boolean(fixturesEnabled),
    enableUatQuickFill: Boolean(uatEnabled),
  };
}
