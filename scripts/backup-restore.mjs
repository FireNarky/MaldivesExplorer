import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 54329;
const sourceName = "maldives_stage1";
const restoreName = "maldives_restore";

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
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

async function main() {
  const pgBin = process.env.PG_BIN;
  if (!pgBin) throw new Error("PG_BIN is required.");
  const pgDump = path.join(pgBin, "pg_dump.exe");
  const pgRestore = path.join(pgBin, "pg_restore.exe");
  const dumpFile = path.join(tmpdir(), "maldives-stage10-1.dump");
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const dataDir = await mkdtemp(path.join(tmpdir(), "maldives-backup-"));
  const embedded = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: "postgres",
    password: "password",
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  const sourceUrl = `postgresql://postgres:password@127.0.0.1:${port}/${sourceName}`;
  const restoreUrl = `postgresql://postgres:password@127.0.0.1:${port}/${restoreName}`;
  const adminUrl = `postgresql://postgres:password@127.0.0.1:${port}/postgres`;
  const env = {
    ...process.env,
    DATABASE_URL: sourceUrl,
    NODE_ENV: "test",
    AUTH_SECRET: "stage-1-migration-secret-32-characters",
    SEED_ADMIN_EMAIL: "migration-admin@example.com",
    SEED_ADMIN_PASSWORD: "stage1-backup-password",
    PGPASSWORD: "password",
    PGHOST: "127.0.0.1",
    PGPORT: String(port),
    PGUSER: "postgres",
  };
  try {
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase(sourceName);
    const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
    const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
    await run(process.execPath, [prismaCli, "migrate", "deploy"], env);
    await run(process.execPath, [tsxCli, "prisma/seed.ts"], env);
    console.log(
      `pg_dump --format=custom --no-owner --no-acl --file=${dumpFile} --dbname=${sourceName}`,
    );
    await run(
      pgDump,
      ["--format=custom", "--no-owner", "--no-acl", `--file=${dumpFile}`, `--dbname=${sourceName}`],
      env,
    );
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${restoreName}`);
    await admin.end();
    const empty = new pg.Client({ connectionString: restoreUrl });
    await empty.connect();
    await empty.query("DROP SCHEMA public CASCADE");
    await empty.query("CREATE SCHEMA public");
    await empty.query("GRANT ALL ON SCHEMA public TO postgres");
    await empty.query("GRANT ALL ON SCHEMA public TO public");
    await empty.end();
    console.log(`pg_restore --no-owner --no-acl --dbname=${restoreName} ${dumpFile}`);
    await run(pgRestore, ["--no-owner", "--no-acl", `--dbname=${restoreName}`, dumpFile], env);
    const check = new pg.Client({ connectionString: restoreUrl });
    await check.connect();
    const tables = await check.query(
      "SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    const triggers = await check.query(
      "SELECT count(*)::int AS triggers FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid WHERE p.proname = 'quote_child_locked'",
    );
    console.log(`Restored public tables: ${tables.rows[0].tables}`);
    console.log(`Restored quote lock triggers: ${triggers.rows[0].triggers}`);
    await check.end();
    await run(process.execPath, [tsxCli, "scripts/verify-restore.ts"], {
      ...env,
      DATABASE_URL: restoreUrl,
    });
  } finally {
    await embedded.stop().catch(() => undefined);
    await rm(dataDir, { recursive: true, force: true });
    await rm(dumpFile, { force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Backup restore failed.");
  process.exitCode = 1;
});
