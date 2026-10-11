import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const text = readFileSync(path.join(root, ".data", "stage1-browser.env"), "utf8");
const env = { ...process.env };
for (const line of text.split(/\r?\n/)) {
  const index = line.indexOf("=");
  if (index > 0) env[line.slice(0, index)] = line.slice(index + 1);
}
delete env.SEED_ADMIN_PASSWORD;
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"],
  { cwd: root, env, stdio: "inherit" },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
