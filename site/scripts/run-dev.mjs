import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import http from "node:http";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".data", "postgres");
const port = 54329;
const databaseName = "maldives_stage1";

async function main() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const isFirstTime = !existsSync(dataDir);
  mkdirSync(path.join(root, ".data"), { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: "postgres",
    password: "password",
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  if (isFirstTime) {
    console.log("Initializing PostgreSQL cluster in .data/postgres...");
    await pg.initialise();
  }

  console.log("Starting embedded PostgreSQL on port", port, "...");
  await pg.start();

  if (isFirstTime) {
    console.log("Creating database", databaseName);
    await pg.createDatabase(databaseName);
  }

  const databaseUrl = `postgresql://postgres:password@127.0.0.1:${port}/${databaseName}`;
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    APP_ENV: "local",
    AUTH_SECRET: process.env.AUTH_SECRET || "stage-1-browser-secret-with-32-characters-min",
    AUTH_URL: process.env.AUTH_URL || "https://xplorer.itnvend.com",
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || "browser-admin@example.com",
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || "AdminPassword123!",
  };

  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

  function runSubprocess(cmd, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { cwd: root, env, stdio: "inherit" });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${args[0] || cmd} exited with code ${code}`));
      });
    });
  }

  if (isFirstTime) {
    console.log("Applying migrations and seeds...");
    await runSubprocess(process.execPath, [prismaCli, "migrate", "deploy"]);
    await runSubprocess(process.execPath, [tsxCli, "prisma/seed.ts"]);
    await runSubprocess(process.execPath, [tsxCli, "scripts/prepare-browser-staff.ts"]);
    await runSubprocess(process.execPath, [tsxCli, "scripts/prepare-browser-discovery.ts"]);
    await runSubprocess(process.execPath, [tsxCli, "scripts/seed-rich-catalog.ts"]);
  }

  // Ensure .env has the right variables
  const envLines = [
    `APP_ENV=local`,
    `DATABASE_URL=${databaseUrl}`,
    `AUTH_SECRET=${env.AUTH_SECRET}`,
    `AUTH_URL=${env.AUTH_URL}`,
    `SEED_ADMIN_EMAIL=${env.SEED_ADMIN_EMAIL}`,
    `SEED_ADMIN_PASSWORD=${env.SEED_ADMIN_PASSWORD}`,
  ];
  writeFileSync(path.join(root, ".env"), envLines.join("\n") + "\n");
  writeFileSync(path.join(root, ".data", "stage1-browser.env"), envLines.join("\n") + "\n");

  console.log("\nStarting Next.js development server at http://127.0.0.1:3000 ...\n");

  const nextProcess = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"],
    { cwd: root, env, stdio: "inherit" },
  );

  // Ingress forwarder proxy on port 3100 for Cloudflare tunnel (xplorer.itnvend.com)
  const tunnelPort = 3100;
  const tunnelProxy = http.createServer((clientReq, clientRes) => {
    const options = {
      hostname: "127.0.0.1",
      port: 3000,
      path: clientReq.url,
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        "x-forwarded-host": clientReq.headers.host || "xplorer.itnvend.com",
        "x-forwarded-proto": clientReq.headers["x-forwarded-proto"] || "https",
      },
    };
    const proxyReq = http.request(options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    });
    proxyReq.on("error", (err) => {
      clientRes.writeHead(502, { "Content-Type": "text/plain" });
      clientRes.end("Proxy Gateway Error: " + err.message);
    });
    clientReq.pipe(proxyReq, { end: true });
  });

  tunnelProxy.on("upgrade", (req, socket, head) => {
    const proxyReq = http.request({
      hostname: "127.0.0.1",
      port: 3000,
      path: req.url,
      method: req.method,
      headers: req.headers,
    });
    if (head && head.length) {
      proxyReq.write(head);
    }
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

  tunnelProxy.listen(tunnelPort, "127.0.0.1", () => {
    console.log(`Cloudflare Tunnel connector ready: http://127.0.0.1:${tunnelPort} -> http://127.0.0.1:3000 (ingress: https://xplorer.itnvend.com)`);
  });

  let shuttingDown = false;
  async function cleanup() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\nStopping servers...");
    if (tunnelProxy) {
      try {
        tunnelProxy.close();
      } catch {
        // ignore
      }
    }
    if (nextProcess && !nextProcess.killed) {
      nextProcess.kill("SIGTERM");
    }
    try {
      await pg.stop();
      console.log("PostgreSQL stopped.");
    } catch (e) {
      console.error("Error stopping PostgreSQL:", e.message);
    }
    process.exit(0);
  }

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  nextProcess.on("exit", async (code) => {
    console.log(`Next.js process exited with code ${code}`);
    await cleanup();
  });
}

main().catch(async (err) => {
  console.error("Failed to start development environment:", err);
  process.exit(1);
});
