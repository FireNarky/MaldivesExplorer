import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { assignRole } from "../src/modules/identity/service";
import {
  saveAtoll,
  saveIsland,
  transitionAtoll,
  transitionIsland,
} from "../src/modules/destinations";
import {
  getPublishedResort,
  listPublishedResorts,
  saveResort,
  transitionResort,
} from "../src/modules/catalog";
import { saveHomepageModule, transitionHomepageModule } from "../src/modules/content";
import { listPublishedHomepageModules } from "../src/modules/content/repository";
import {
  storeMedia,
  transitionMedia,
  updateMediaDetails,
  readPublishedMedia,
  linkMedia,
} from "../src/modules/media/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the catalog exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error("Catalog exercise refused a database that is not disposable maldives_stage1.");
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
    if (rows.length !== 0) throw new Error(`Catalog exercise left ${rows.length} integrity rows.`);
  }
}

async function staff(email: string, name: string) {
  return db.user.create({
    data: { email, name, status: "ACTIVE", passwordHash: "catalog-exercise-hash" },
  });
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const admin = await db.user.findUniqueOrThrow({
    where: { email: "migration-admin@example.com" },
  });
  const editor = await staff("catalog-editor@example.com", "Catalog editor");
  const approver = await staff("catalog-approver@example.com", "Catalog approver");
  await assignRole({ actorId: admin.id, userId: editor.id, role: "CONTENT_EDITOR" });
  await assignRole({ actorId: admin.id, userId: approver.id, role: "CONTENT_APPROVER" });

  const atollId = await saveAtoll(editor.id, {
    name: "Exercise atoll",
    slug: "exercise-atoll",
    summary: "Exercise geography.",
    description: "Exercise geography.",
    seoTitle: "Exercise atoll",
    seoDescription: "Exercise geography.",
  });
  const islandId = await saveIsland(editor.id, {
    atollId,
    islandType: "RESORT",
    name: "Exercise island",
    slug: "exercise-island",
    summary: "Exercise geography.",
    description: "Exercise geography.",
    seoTitle: "Exercise island",
    seoDescription: "Exercise geography.",
  });
  const resortId = await saveResort(editor.id, {
    islandId,
    name: "Exercise resort",
    slug: "exercise-resort",
    propertyType: "RESORT",
    summary: "Exercise property.",
    description: "Exercise property.",
    seoTitle: "Exercise resort",
    seoDescription: "Exercise property.",
  });
  await saveResort(
    editor.id,
    {
      islandId,
      name: "Exercise resort revised",
      slug: "exercise-resort",
      propertyType: "RESORT",
      summary: "Exercise property revised.",
      description: "Exercise property.",
      seoTitle: "Exercise resort",
      seoDescription: "Exercise property.",
    },
    resortId,
  );

  await expectFailure(() => transitionResort(editor.id, resortId, "PUBLISHED"), /cannot do that/i);
  await transitionAtoll(editor.id, atollId, "IN_REVIEW");
  await transitionAtoll(approver.id, atollId, "APPROVED");
  await transitionAtoll(approver.id, atollId, "PUBLISHED");
  await transitionIsland(editor.id, islandId, "IN_REVIEW");
  await transitionIsland(approver.id, islandId, "APPROVED");
  await transitionIsland(approver.id, islandId, "PUBLISHED");
  await transitionResort(editor.id, resortId, "IN_REVIEW");
  await transitionResort(approver.id, resortId, "APPROVED");
  await transitionResort(approver.id, resortId, "PUBLISHED");

  const listed = await listPublishedResorts();
  const published = listed.find((row) => row.slug === "exercise-resort");
  if (!published || "indicativeFromPrice" in published) {
    throw new Error(
      "The published resort list did not return the exercise resort without a price.",
    );
  }
  const detail = await getPublishedResort("exercise-resort");
  if (!detail || detail.name !== "Exercise resort revised" || "indicativeFromPrice" in detail) {
    throw new Error(
      "The published resort page query did not return the exercise resort without a price.",
    );
  }

  await transitionResort(approver.id, resortId, "UNPUBLISHED");
  const hidden = await getPublishedResort("exercise-resort");
  if (hidden) throw new Error("An unpublished resort remained public.");

  const ownAtoll = await saveAtoll(approver.id, {
    name: "Approver atoll",
    slug: "approver-atoll",
    summary: "Exercise geography.",
    description: "Exercise geography.",
    seoTitle: "Approver atoll",
    seoDescription: "Exercise geography.",
  });
  await transitionAtoll(approver.id, ownAtoll, "IN_REVIEW");
  await transitionAtoll(approver.id, ownAtoll, "APPROVED");
  await expectFailure(
    () => transitionAtoll(approver.id, ownAtoll, "PUBLISHED"),
    /Another person must publish/,
  );

  const moduleId = await saveHomepageModule(editor.id, {
    moduleType: "FEATURED_OFFERS",
    title: "Exercise module",
    sortOrder: 0,
  });
  await transitionHomepageModule(editor.id, moduleId, "IN_REVIEW");
  await expectFailure(
    () => transitionHomepageModule(editor.id, moduleId, "APPROVED"),
    /cannot do that/i,
  );
  await transitionHomepageModule(approver.id, moduleId, "APPROVED");
  await transitionHomepageModule(approver.id, moduleId, "PUBLISHED");
  const modules = await listPublishedHomepageModules();
  const emptyModule = modules.find((row) => row.id === moduleId);
  if (!emptyModule || JSON.stringify(emptyModule.config) !== "{}") {
    throw new Error("The empty homepage module was not published.");
  }

  const file = await storeMedia({
    actorId: editor.id,
    fileName: "exercise.png",
    mimeType: "image/png",
    body: Uint8Array.from([137, 80, 78, 71]),
  });
  await expectFailure(() => transitionMedia(approver.id, file.id, "PUBLISHED"), /alt text/i);
  await updateMediaDetails(editor.id, file.id, { altText: "Exercise image" });
  await transitionMedia(editor.id, file.id, "IN_REVIEW");
  await transitionMedia(approver.id, file.id, "APPROVED");
  await transitionMedia(approver.id, file.id, "PUBLISHED");
  await linkMedia(approver.id, {
    mediaId: file.id,
    ownerType: "RESORT",
    ownerId: resortId,
    role: "GALLERY",
  });
  const readable = await readPublishedMedia(file.id);
  if (!readable) throw new Error("A published image was not readable.");

  const actions = await db.auditLog.findMany({
    where: {
      action: {
        in: [
          "catalog.create",
          "catalog.update",
          "catalog.transition",
          "content.create",
          "content.transition",
          "media.create",
          "media.transition",
        ],
      },
    },
    select: { action: true },
  });
  const found = new Set(actions.map((row) => row.action));
  for (const action of [
    "catalog.create",
    "catalog.update",
    "catalog.transition",
    "content.create",
    "content.transition",
    "media.create",
    "media.transition",
  ]) {
    if (!found.has(action)) throw new Error(`Missing audit action ${action}.`);
  }

  await expectIntegrity();
  console.log("Catalog exercise passed.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Catalog exercise failed.");
    await db.$disconnect();
    process.exit(1);
  });
