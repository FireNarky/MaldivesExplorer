/**
 * Starts the persistent embedded PostgreSQL cluster under `.data/postgres` and keeps it alive.
 * Path is derived from this script's location — never from a machine-specific absolute path.
 */

import { DEFAULT_DB_PORT, resolvePostgresDataDir, resolveRepoRoot } from "./lib/dev-runtime";

const root = resolveRepoRoot();
const dataDir = resolvePostgresDataDir(root);
const port = Number(process.env.DEV_DB_PORT || DEFAULT_DB_PORT);

const { default: EmbeddedPostgres } = await import("embedded-postgres");

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port,
  user: "postgres",
  password: "password",
  persistent: true,
});

async function run(): Promise<void> {
  console.log(`Starting embedded PostgreSQL on 127.0.0.1:${port}...`);
  await pg.start();
  console.log(`Embedded PostgreSQL is now running on 127.0.0.1:${port}`);

  const stop = async (): Promise<void> => {
    try {
      await pg.stop();
    } catch {
      // ignore
    }
    process.exit(0);
  };
  process.on("SIGINT", () => {
    void stop();
  });
  process.on("SIGTERM", () => {
    void stop();
  });

  setInterval(() => {}, 60_000);
}

run().catch((err: unknown) => {
  console.error("PostgreSQL start error:", err instanceof Error ? err.message : "unknown error");
  process.exit(1);
});
