/**
 * Local development launcher (`npm run dev:all`).
 *
 * Starts an embedded PostgreSQL cluster under `.data/postgres`, applies migrations/seeds on
 * first run, then starts Next.js on 127.0.0.1:3000.
 *
 * Safety (Phase 4 / F-08):
 * - Never creates, rewrites, or reformats the repository root `.env`.
 * - Consumes `process.env` only (does not load `.env` / `.env.local` itself).
 * - AUTH_URL defaults to the local app URL; tunnel mode requires a non-loopback public origin.
 * - Team Board is optional via ME_TEAM_BOARD_DIR / DEV_TEAM_BOARD_DIR.
 * - Does not set ALLOW_TEST_FIXTURES or ENABLE_UAT_QUICK_FILL.
 * - Logs never include passwords or full DATABASE_URL credentials.
 */

import { type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import http from "node:http";
import type { Server } from "node:http";
import path from "node:path";

import {
  assertPortFree,
  OwnedProcessRegistry,
  spawnOwned,
  stopLauncherResources,
} from "./lib/dev-lifecycle";
import {
  DEFAULT_APP_PORT,
  DEFAULT_BOARD_PORT,
  DEFAULT_DATABASE_NAME,
  DEFAULT_DB_PORT,
  DEFAULT_TUNNEL_PROXY_PORT,
  buildDatabaseUrl,
  buildLauncherChildEnv,
  isDevTunnelEnabled,
  isExplicitTrue,
  resolvePostgresDataDir,
  resolveRepoRoot,
  resolveRootEnvPath,
  resolveTeamBoardDir,
  safeLauncherSummary,
  writeGeneratedEnvFile,
} from "./lib/dev-runtime";

const root = resolveRepoRoot();
const dataDir = resolvePostgresDataDir(root);
const appPort = Number(process.env.DEV_APP_PORT || DEFAULT_APP_PORT);
const dbPort = Number(process.env.DEV_DB_PORT || DEFAULT_DB_PORT);
const tunnelProxyPort = Number(process.env.DEV_TUNNEL_PROXY_PORT || DEFAULT_TUNNEL_PROXY_PORT);
const boardPort = Number(process.env.DEV_BOARD_PORT || DEFAULT_BOARD_PORT);
const databaseName = process.env.DEV_DATABASE_NAME || DEFAULT_DATABASE_NAME;
const tunnelEnabled = isDevTunnelEnabled(process.env);
const teamBoardDir = resolveTeamBoardDir(root, process.env);

type EmbeddedPgInstance = {
  initialise: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  createDatabase: (name: string) => Promise<void>;
};

const registry = new OwnedProcessRegistry();
let pg: EmbeddedPgInstance | undefined;
let tunnelProxy: Server | undefined;
let shuttingDown = false;

function logStage(message: string): void {
  console.log(message);
}

function assertRootEnvUntouched(beforeBytes: Buffer | null): void {
  const rootEnv = resolveRootEnvPath(root);
  if (beforeBytes === null) {
    if (existsSync(rootEnv)) {
      throw new Error("Launcher must not create a root .env file.");
    }
    return;
  }
  const afterBytes = readFileSync(rootEnv);
  if (!beforeBytes.equals(afterBytes)) {
    throw new Error("Launcher must not modify the repository root .env file.");
  }
}

async function cleanup(exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logStage("\nStopping launcher-owned processes...");

  await stopLauncherResources({
    registry,
    resources: [
      {
        stop: () =>
          new Promise<void>((resolve) => {
            if (!tunnelProxy) {
              resolve();
              return;
            }
            tunnelProxy.close(() => resolve());
            tunnelProxy = undefined;
          }),
      },
      {
        stop: async () => {
          if (!pg) return;
          try {
            await pg.stop();
            logStage("Embedded PostgreSQL stopped.");
          } catch (error) {
            console.error(
              "Error stopping PostgreSQL:",
              error instanceof Error ? error.message : "unknown error",
            );
          } finally {
            pg = undefined;
          }
        },
      },
    ],
  });

  process.exit(exitCode);
}

function runSubprocess(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnOwned(registry, cmd, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${path.basename(args[0] || cmd)} exited with code ${code ?? "unknown"}`));
    });
  });
}

function createTunnelProxy(publicOrigin: string): Server {
  const dashboardPrefixes = [
    "/board",
    "/dashboard",
    "/my",
    "/team",
    "/activity",
    "/documents",
    "/api/tasks",
    "/api/projects",
    "/api/tags",
    "/api/session",
    "/api/users",
    "/api/version",
  ];

  function getTargetPort(url: string | undefined, referer = ""): number {
    const cleanPath = (url || "/").split("?")[0] ?? "/";
    if (dashboardPrefixes.some((p) => cleanPath === p || cleanPath.startsWith(`${p}/`))) {
      return boardPort;
    }
    if (
      cleanPath.startsWith("/_next/") ||
      cleanPath.startsWith("/icons/") ||
      cleanPath.endsWith(".woff2") ||
      cleanPath.endsWith(".png") ||
      cleanPath.endsWith(".svg")
    ) {
      if (dashboardPrefixes.some((p) => referer.includes(p))) {
        return boardPort;
      }
    }
    return appPort;
  }

  const publicHost = new URL(publicOrigin).host;

  const proxy = http.createServer((clientReq, clientRes) => {
    const referer = clientReq.headers.referer || "";
    const primaryPort = getTargetPort(clientReq.url, referer);

    function forward(port: number, fallback: (() => void) | null): void {
      const options = {
        hostname: "127.0.0.1",
        port,
        path: clientReq.url,
        method: clientReq.method,
        headers: {
          ...clientReq.headers,
          "x-forwarded-host": clientReq.headers.host || publicHost,
          "x-forwarded-proto": clientReq.headers["x-forwarded-proto"] || "https",
        },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        if (fallback && proxyRes.statusCode === 404) {
          fallback();
          return;
        }
        clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(clientRes, { end: true });
      });

      proxyReq.on("error", (err) => {
        if (fallback) {
          fallback();
          return;
        }
        clientRes.writeHead(502, { "Content-Type": "text/plain" });
        clientRes.end(`Proxy Gateway Error: ${err.message}`);
      });

      clientReq.pipe(proxyReq, { end: true });
    }

    const cleanPath = (clientReq.url || "/").split("?")[0] ?? "/";
    if (cleanPath.startsWith("/_next/")) {
      const secondaryPort = primaryPort === appPort ? boardPort : appPort;
      forward(primaryPort, () => forward(secondaryPort, null));
    } else {
      forward(primaryPort, null);
    }
  });

  proxy.on("upgrade", (req, socket, head) => {
    const targetPort = getTargetPort(req.url, req.headers.referer || "");
    const proxyReq = http.request({
      hostname: "127.0.0.1",
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    });
    if (head && head.length) proxyReq.write(head);
    proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
          Object.entries(proxyRes.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\r\n") +
          "\r\n\r\n",
      );
      if (proxyHead.length) socket.write(proxyHead);
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });
    proxyReq.on("error", () => socket.destroy());
    proxyReq.end();
  });

  return proxy;
}

async function main(): Promise<void> {
  const rootEnvPath = resolveRootEnvPath(root);
  const rootEnvBefore = existsSync(rootEnvPath) ? readFileSync(rootEnvPath) : null;

  await assertPortFree(dbPort, "PostgreSQL");
  await assertPortFree(appPort, "Next.js");
  if (tunnelEnabled) {
    await assertPortFree(tunnelProxyPort, "Dev tunnel proxy");
  }

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const isFirstTime = !existsSync(dataDir);
  mkdirSync(path.join(root, ".data"), { recursive: true });

  pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: dbPort,
    user: "postgres",
    password: "password",
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  if (isFirstTime) {
    logStage("Initializing PostgreSQL cluster in .data/postgres...");
    await pg.initialise();
  }

  logStage(`Starting embedded PostgreSQL on 127.0.0.1:${dbPort} ...`);
  await pg.start();

  if (isFirstTime) {
    logStage(`Creating database ${databaseName}`);
    await pg.createDatabase(databaseName);
  }

  const databaseUrl = buildDatabaseUrl({
    host: "127.0.0.1",
    port: dbPort,
    database: databaseName,
  });

  // process.env only — this launcher does not read .env / .env.local files.
  const childEnv = buildLauncherChildEnv(process.env, {
    databaseUrl,
    appPort,
    tunnelEnabled,
  });

  const fixturesEnabled = isExplicitTrue(childEnv.ALLOW_TEST_FIXTURES);
  const uatEnabled = isExplicitTrue(childEnv.ENABLE_UAT_QUICK_FILL);

  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const childProcessEnv = { ...process.env, ...childEnv } as NodeJS.ProcessEnv;

  if (isFirstTime) {
    logStage("Applying migrations and seeds...");
    await runSubprocess(process.execPath, [prismaCli, "migrate", "deploy"], childProcessEnv);
    await runSubprocess(process.execPath, [tsxCli, "prisma/seed.ts"], childProcessEnv);
    await runSubprocess(
      process.execPath,
      [tsxCli, "scripts/prepare-browser-staff.ts"],
      childProcessEnv,
    );
    await runSubprocess(
      process.execPath,
      [tsxCli, "scripts/prepare-browser-discovery.ts"],
      childProcessEnv,
    );
    await runSubprocess(
      process.execPath,
      [tsxCli, "scripts/seed-rich-catalog.ts"],
      childProcessEnv,
    );
  }

  const generatedPath = writeGeneratedEnvFile(root, childEnv);
  assertRootEnvUntouched(rootEnvBefore);

  const authUrl = childEnv.AUTH_URL ?? `http://127.0.0.1:${appPort}`;
  const summary = safeLauncherSummary({
    appPort,
    dbPort,
    authUrl,
    tunnelEnabled,
    teamBoardDir,
    fixturesEnabled,
    uatEnabled,
  });

  logStage("\nLauncher configuration (secrets redacted):");
  logStage(`  Local app URL:     ${String(summary.appUrl)}`);
  logStage(`  AUTH_URL:          ${String(summary.authUrl)}`);
  logStage(
    `  Database:          ${String(summary.databaseHost)}:${String(summary.databasePort)}/${databaseName}`,
  );
  logStage(`  Generated env:     ${path.relative(root, generatedPath)} (root .env untouched)`);
  logStage(
    `  Tunnel proxy:      ${summary.tunnelEnabled ? `enabled on 127.0.0.1:${tunnelProxyPort}` : "disabled (set ENABLE_DEV_TUNNEL=true to opt in)"}`,
  );
  logStage(
    `  Team Board:        ${summary.teamBoardConfigured ? teamBoardDir : "skipped (set ME_TEAM_BOARD_DIR to enable)"}`,
  );
  logStage(
    `  Test fixtures:     ${summary.allowTestFixtures ? "ENABLED (developer opt-in)" : "hidden (fail-closed)"}`,
  );
  logStage(
    `  UAT quick-fill:    ${summary.enableUatQuickFill ? "ENABLED (developer opt-in)" : "off (fail-closed)"}`,
  );
  logStage("");

  logStage(`Starting Next.js development server at ${String(summary.appUrl)} ...\n`);

  const nextProcess: ChildProcess = spawnOwned(
    registry,
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(appPort),
    ],
    { cwd: root, env: childProcessEnv, stdio: "inherit" },
  );

  if (teamBoardDir && existsSync(teamBoardDir)) {
    const boardBusy = await new Promise<boolean>((resolve) => {
      const checkReq = http.get(`http://127.0.0.1:${boardPort}/api/version`, (res) => {
        resolve((res.statusCode ?? 500) < 500);
      });
      checkReq.on("error", () => resolve(false));
      checkReq.setTimeout(500, () => {
        checkReq.destroy();
        resolve(false);
      });
    });

    if (!boardBusy) {
      logStage(
        `Starting optional Team Board from ME_TEAM_BOARD_DIR on http://127.0.0.1:${boardPort} ...`,
      );
      spawnOwned(registry, "npx", ["next", "start", "-H", "127.0.0.1", "-p", String(boardPort)], {
        cwd: teamBoardDir,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
    } else {
      logStage(`Team Board already responding on http://127.0.0.1:${boardPort}`);
    }
  }

  if (tunnelEnabled) {
    tunnelProxy = createTunnelProxy(authUrl);
    await new Promise<void>((resolve, reject) => {
      if (!tunnelProxy) {
        reject(new Error("Tunnel proxy was not created."));
        return;
      }
      tunnelProxy.once("error", reject);
      tunnelProxy.listen(tunnelProxyPort, "127.0.0.1", () => {
        logStage(`\n================================================================`);
        logStage(`Dev tunnel proxy listening on http://127.0.0.1:${tunnelProxyPort}`);
        logStage(`Public AUTH_URL / tunnel host: ${authUrl}`);
        logStage(`Travel app: http://127.0.0.1:${appPort}`);
        if (teamBoardDir) logStage(`Team Board: http://127.0.0.1:${boardPort}`);
        logStage(`Point your external tunnel at 127.0.0.1:${tunnelProxyPort}`);
        logStage(`================================================================\n`);
        resolve();
      });
    });
  }

  process.on("SIGINT", () => {
    void cleanup(0);
  });
  process.on("SIGTERM", () => {
    void cleanup(0);
  });

  nextProcess.on("exit", (code) => {
    logStage(`Next.js process exited with code ${code}`);
    void cleanup(code === 0 || code === null ? 0 : 1);
  });
}

main().catch(async (err: unknown) => {
  console.error(
    "Failed to start development environment:",
    err instanceof Error ? err.message : "unknown error",
  );
  await cleanup(1);
});
