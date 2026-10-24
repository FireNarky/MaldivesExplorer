import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".data", "postgres");

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port: 54329,
  user: "postgres",
  password: "password",
  persistent: true,
});

async function run() {
  console.log("Starting embedded PostgreSQL on port 54329...");
  await pg.start();
  console.log("Embedded PostgreSQL is now running on 127.0.0.1:54329");
  
  // Keep process alive
  setInterval(() => {}, 60000);
}

run().catch((err) => {
  console.error("PostgreSQL start error:", err);
  process.exit(1);
});
