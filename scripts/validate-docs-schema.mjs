import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const markdown = readFileSync("Documentation/Database_Design.md", "utf8").replace(/\r\n/g, "\n");
const match = markdown.match(/```prisma\n([\s\S]*?)```/);

if (!match || !match[1]) {
  console.error("Prisma schema fence not found in Documentation/Database_Design.md");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "me-schema-"));
const schema = join(dir, "schema.prisma");
writeFileSync(schema, `${match[1].trim()}\n`);

const result = spawnSync("npx", ["--no-install", "prisma", "validate", "--schema", schema], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

rmSync(dir, { recursive: true, force: true });
process.exit(result.status ?? 1);
