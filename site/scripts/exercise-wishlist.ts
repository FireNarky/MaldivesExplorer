import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { saveResort, transitionResort } from "../src/modules/catalog";
import {
  addSavedItem,
  listSavedItems,
  mergeSavedItems,
  removeSavedItem,
  updateSavedNote,
} from "../src/modules/wishlist/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the wishlist exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error("Wishlist exercise refused a database that is not disposable maldives_stage1.");
  }
}

async function expectFailure(run: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (pattern.test(message)) return;
    throw error;
  }
  throw new Error(`Expected a rejection matching ${pattern.source}.`);
}

async function expectIntegrity(): Promise<void> {
  const sql = readFileSync(
    path.join(process.cwd(), "scripts", "foundation-assertions.sql"),
    "utf8",
  );
  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) =>
      statement.split("\n").some((line) => line.trim() !== "" && !line.trim().startsWith("--")),
    );
  for (const statement of statements) {
    const rows = await db.$queryRawUnsafe<unknown[]>(statement);
    if (rows.length !== 0) throw new Error(`Wishlist exercise left ${rows.length} integrity rows.`);
  }
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const editor = await db.user.findUniqueOrThrow({
    where: { email: "catalog-editor@example.com" },
  });
  const approver = await db.user.findUniqueOrThrow({
    where: { email: "catalog-approver@example.com" },
  });
  const island = await db.island.findUniqueOrThrow({ where: { slug: "exercise-island" } });
  const resortId = await saveResort(editor.id, {
    islandId: island.id,
    name: "Wishlist exercise resort",
    slug: "wishlist-exercise-resort",
    propertyType: "RESORT",
    summary: "Wishlist exercise property.",
    description: "Wishlist exercise property.",
    seoTitle: "Wishlist exercise resort",
    seoDescription: "Wishlist exercise property.",
  });
  await transitionResort(editor.id, resortId, "IN_REVIEW");
  await transitionResort(approver.id, resortId, "APPROVED");
  await transitionResort(approver.id, resortId, "PUBLISHED");
  const draftId = await saveResort(editor.id, {
    islandId: island.id,
    name: "wishlistdrafttoken",
    slug: "wishlist-draft-token",
    propertyType: "RESORT",
    summary: "Draft wishlist row.",
    description: "Draft wishlist row.",
    seoTitle: "Draft wishlist row",
    seoDescription: "Draft wishlist row.",
  });
  const owner = await db.user.create({
    data: { email: "wishlist-owner@example.com", name: "Wishlist owner", status: "ACTIVE" },
  });
  const other = await db.user.create({
    data: { email: "wishlist-other@example.com", name: "Wishlist other", status: "ACTIVE" },
  });

  await expectFailure(() => addSavedItem(owner.id, "RESORT", draftId), /not currently published/i);
  await addSavedItem(owner.id, "RESORT", resortId);
  const created = await listSavedItems(owner.id);
  const saved = created.find((item) => item.entityId === resortId);
  if (!saved?.savedItemId || !saved.available || saved.name !== "Wishlist exercise resort") {
    throw new Error("The published resort was not saved on the account.");
  }
  await updateSavedNote(owner.id, saved.savedItemId, "Account note");
  await expectFailure(() => removeSavedItem(other.id, saved.savedItemId ?? ""), /another account/i);
  await expectFailure(
    () => updateSavedNote(other.id, saved.savedItemId ?? "", "Other note"),
    /another account/i,
  );

  const missing = "11111111-1111-4111-8111-111111111111";
  const merged = await mergeSavedItems(owner.id, [
    {
      entityType: "RESORT",
      entityId: resortId,
      note: "Device note",
      savedAt: "2020-01-01T00:00:00.000Z",
    },
    {
      entityType: "RESORT",
      entityId: draftId,
      note: "Hidden draft",
      savedAt: "2020-01-02T00:00:00.000Z",
    },
    {
      entityType: "RESORT",
      entityId: missing,
      note: "Missing",
      savedAt: "2020-01-03T00:00:00.000Z",
    },
  ]);
  if (merged.skipped !== 1) throw new Error("A missing listing was stored.");
  const listed = await listSavedItems(owner.id);
  if (listed.length !== 2) throw new Error("Merge stored a duplicate or dropped a real listing.");
  const published = listed.find((item) => item.entityId === resortId);
  if (published?.note !== "Account note\nDevice note") {
    throw new Error("Merge did not keep both notes.");
  }
  const hidden = listed.find((item) => item.entityId === draftId);
  if (!hidden || hidden.available || hidden.name !== null) {
    throw new Error("An unpublished listing was named on the saved list.");
  }
  const customer = await db.customer.findUniqueOrThrow({ where: { userId: owner.id } });
  const audits = await db.auditLog.findMany({
    where: {
      actorId: owner.id,
      action: { in: ["wishlist.merge", "customer.create", "wishlist.add"] },
    },
  });
  if (!audits.some((row) => row.action === "wishlist.merge" && row.entityId === customer.id)) {
    throw new Error("Merge was not audited.");
  }
  if (!audits.some((row) => row.action === "customer.create")) {
    throw new Error("The customer record was not audited.");
  }
  await mergeSavedItems(owner.id, [
    {
      entityType: "RESORT",
      entityId: resortId,
      note: "Device note",
      savedAt: "2020-01-01T00:00:00.000Z",
    },
  ]);
  const count = await db.savedItem.count({
    where: { customerId: customer.id, entityId: resortId },
  });
  if (count !== 1) throw new Error("A repeated merge created a duplicate.");
  await expectIntegrity();
  console.log("Wishlist exercise passed.");
  await db.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : "Wishlist exercise failed.");
  await db.$disconnect();
  process.exitCode = 1;
});
