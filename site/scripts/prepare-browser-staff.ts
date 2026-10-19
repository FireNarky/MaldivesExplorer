import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { assignRole } from "../src/modules/identity/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error(
      "Browser staff setup refused a database that is not disposable maldives_stage1.",
    );
  }
}

async function staff(email: string, name: string, password: string) {
  const passwordHash = await hashPassword(password);
  return db.user.upsert({
    where: { email },
    update: { passwordHash, status: "ACTIVE" },
    create: { email, name, passwordHash, status: "ACTIVE" },
  });
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const admin = await db.user.findUniqueOrThrow({ where: { email: "browser-admin@example.com" } });
  const editorPassword = `editor-${randomBytes(9).toString("base64url")}`;
  const approverPassword = `approver-${randomBytes(9).toString("base64url")}`;
  const editor = await staff("browser-editor@example.com", "Browser editor", editorPassword);
  const approver = await staff(
    "browser-approver@example.com",
    "Browser approver",
    approverPassword,
  );
  await assignRole({ actorId: admin.id, userId: editor.id, role: "CONTENT_EDITOR" });
  await assignRole({ actorId: admin.id, userId: approver.id, role: "CONTENT_APPROVER" });
  await mkdir(path.join(process.cwd(), ".data"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), ".data", "stage2-staff.env"),
    [
      `EDITOR_EMAIL=${editor.email}`,
      `EDITOR_PASSWORD=${editorPassword}`,
      `APPROVER_EMAIL=${approver.email}`,
      `APPROVER_PASSWORD=${approverPassword}`,
    ].join("\n"),
  );
  console.log("Disposable staff accounts are ready.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Browser staff setup failed.");
    await db.$disconnect();
    process.exit(1);
  });
