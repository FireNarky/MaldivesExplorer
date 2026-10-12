import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseName = "maldives_stage1";
const port = 54329;

function assertDisposable(databaseUrl) {
  const url = new URL(databaseUrl);
  const name = url.pathname.replace(/^\//, "");
  if ((url.hostname !== "127.0.0.1" && url.hostname !== "localhost") || name !== databaseName) {
    throw new Error("Migration test refused a database that is not disposable maldives_stage1.");
  }
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${path.basename(command)} ${args.join(" ")} exited ${code ?? "unknown"}.`),
        );
    });
  });
}

function runNode(script, args, env) {
  return run(process.execPath, [script, ...args], env);
}

async function resetPublic(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO postgres");
    await client.query("GRANT ALL ON SCHEMA public TO public");
  } finally {
    await client.end();
  }
}

async function main() {
  const serve = process.argv.includes("--serve");
  const inherited = process.env.CI === "true" ? process.env.DATABASE_URL : undefined;
  let databaseUrl = inherited;
  let embedded;
  let dataDir;
  if (!inherited) {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    dataDir = await mkdtemp(path.join(tmpdir(), "maldives-pg-"));
    embedded = new EmbeddedPostgres({
      databaseDir: dataDir,
      port,
      user: "postgres",
      password: "password",
      persistent: false,
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
    });
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase(databaseName);
    databaseUrl = `postgresql://postgres:password@127.0.0.1:${port}/${databaseName}`;
  }
  if (!databaseUrl) throw new Error("DATABASE_URL is required for the migration test.");
  assertDisposable(databaseUrl);

  const adminPassword = `stage1-${Math.random().toString(36).slice(2)}-password`;
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: "test",
    AUTH_SECRET: serve
      ? "stage-1-browser-secret-with-32-characters"
      : process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32
        ? process.env.AUTH_SECRET
        : "stage-1-migration-secret-32-characters",
    MEDIA_STORAGE_PATH: path.join(tmpdir(), "maldives-stage2-media"),
    SEED_ADMIN_EMAIL: serve ? "browser-admin@example.com" : "migration-admin@example.com",
    SEED_ADMIN_PASSWORD: adminPassword,
  };
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

  try {
    if (serve) {
      await runNode(prismaCli, ["migrate", "deploy"], env);
      await runNode(tsxCli, ["prisma/seed.ts"], env);
      await mkdir(path.join(root, ".data"), { recursive: true });
      await writeFile(
        path.join(root, ".data", "stage1-browser.env"),
        [
          `DATABASE_URL=${databaseUrl}`,
          `AUTH_SECRET=${env.AUTH_SECRET}`,
          "AUTH_URL=http://127.0.0.1:3000",
          "APP_ENV=local",
          `SEED_ADMIN_EMAIL=${env.SEED_ADMIN_EMAIL}`,
          `SEED_ADMIN_PASSWORD=${adminPassword}`,
        ].join("\n"),
      );
      console.log("Disposable database is ready for browser checks.");
      await new Promise(() => {});
    }
    await runNode(prismaCli, ["migrate", "deploy"], env);
    await runNode(tsxCli, ["prisma/seed.ts"], env);
    await runNode(tsxCli, ["scripts/exercise-foundation.ts"], env);
    await runNode(tsxCli, ["scripts/exercise-catalog.ts"], env);
    await runNode(tsxCli, ["scripts/exercise-discovery.ts"], env);
    await runNode(tsxCli, ["scripts/exercise-wishlist.ts"], env);
    await runNode(tsxCli, ["scripts/exercise-enquiry.ts"], env);
    await runNode(tsxCli, ["scripts/exercise-portal.ts"], env);
    await runNode(tsxCli, ["scripts/exercise-crm.ts"], env);
    await resetPublic(databaseUrl);
    await runNode(prismaCli, ["migrate", "deploy"], env);
    console.log("Migrations applied, exercised, dropped, and reapplied.");
  } finally {
    if (embedded) {
      try {
        await embedded.stop();
      } catch (error) {
        console.error(
          error instanceof Error ? error.message : "Could not stop the disposable database.",
        );
      }
    }
    if (dataDir) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await rm(dataDir, { recursive: true, force: true }).catch(() => undefined);
    }
    await rm(path.join(tmpdir(), "maldives-stage2-media"), { recursive: true, force: true }).catch(
      () => undefined,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration test failed.");
  process.exit(1);
});
