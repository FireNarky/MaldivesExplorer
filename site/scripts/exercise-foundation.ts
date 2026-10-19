import { readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { enqueueJob, runDueJobs } from "../src/jobs/worker";
import { assignRole } from "../src/modules/identity/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the migration exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error(
      "Migration exercise refused a database that is not disposable maldives_stage1.",
    );
  }
}

function statements(): string[] {
  const sql = readFileSync(
    path.join(process.cwd(), "scripts", "foundation-assertions.sql"),
    "utf8",
  );
  return sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) =>
      statement.split("\n").some((line) => line.trim() !== "" && !line.trim().startsWith("--")),
    );
}

async function expectZeroRows(label: string): Promise<void> {
  for (const statement of statements()) {
    const rows = await db.$queryRawUnsafe<unknown[]>(statement);
    if (rows.length !== 0) {
      throw new Error(`${label} assertion returned ${rows.length} rows.`);
    }
  }
}

async function expectRejection(run: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (pattern.test(message)) return;
    throw error;
  }
  throw new Error(`Expected a database rejection matching ${pattern.source}.`);
}

async function createResortPair(tx: Prisma.TransactionClient) {
  const meal = await tx.vocabularyItem.findFirstOrThrow({
    where: { set: "MEAL_PLAN", code: "ROOM_ONLY" },
  });
  const occupancy = await tx.vocabularyItem.findFirstOrThrow({
    where: { set: "OCCUPANCY_BASIS", code: "DOUBLE" },
  });
  const category = await tx.vocabularyItem.findFirstOrThrow({
    where: { set: "ROOM_CATEGORY", code: "ROOM" },
  });
  const atoll = await tx.atoll.create({
    data: {
      name: "Migration atoll",
      slug: "migration-atoll",
      summary: "Migration row.",
      description: "Migration row.",
    },
  });
  const island = await tx.island.create({
    data: {
      atollId: atoll.id,
      name: "Migration island",
      slug: "migration-island",
      islandType: "RESORT",
      summary: "Migration row.",
      description: "Migration row.",
    },
  });
  const resortA = await tx.resort.create({
    data: {
      islandId: island.id,
      name: "Migration resort a",
      slug: "migration-resort-a",
      summary: "Migration row.",
      description: "Migration row.",
    },
  });
  const resortB = await tx.resort.create({
    data: {
      islandId: island.id,
      name: "Migration resort b",
      slug: "migration-resort-b",
      summary: "Migration row.",
      description: "Migration row.",
    },
  });
  const room = await tx.roomType.create({
    data: {
      resortId: resortB.id,
      categoryId: category.id,
      name: "Migration room",
      slug: "migration-room",
      description: "Migration row.",
      maxAdults: 2,
    },
  });
  return { meal, occupancy, resortA, room };
}

async function createSentQuote(tx: Prisma.TransactionClient, createdById: string) {
  const customer = await tx.customer.create({
    data: { name: "Migration customer", email: "migration-customer@example.com" },
  });
  const enquiry = await tx.enquiry.create({
    data: {
      reference: "ME-E-900001",
      customerId: customer.id,
      adultCount: 1,
      submittedSnapshot: { source: "migration-test" },
      idempotencyKey: "migration-enquiry",
    },
  });
  const quote = await tx.quote.create({
    data: { enquiryId: enquiry.id, reference: "ME-Q-900001" },
  });
  const version = await tx.quoteVersion.create({
    data: {
      quoteId: quote.id,
      versionNo: 1,
      currency: "USD",
      subtotal: 0,
      taxTotal: 0,
      feeTotal: 0,
      discountTotal: 0,
      grandTotal: 0,
      termsSnapshot: "Migration row.",
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      createdById,
    },
  });
  const item = await tx.quoteItem.create({
    data: {
      quoteVersionId: version.id,
      itemType: "OTHER",
      description: "Migration line",
      quantity: 1,
      unitAmount: 0,
      lineTotal: 0,
      sortOrder: 1,
    },
  });
  await tx.quoteVersion.update({
    where: { id: version.id },
    data: { status: "SENT", sentAt: new Date("2026-10-11T00:00:00.000Z") },
  });
  return { version, item };
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("SEED_ADMIN_EMAIL is required for the migration exercise.");
  const actor = await db.user.findUniqueOrThrow({ where: { email } });

  await expectZeroRows("Seed");

  await expectRejection(async () => {
    await db.$transaction(async (tx) => {
      const { meal, occupancy, resortA, room } = await createResortPair(tx);
      await tx.offer.create({
        data: {
          resortId: resortA.id,
          roomTypeId: room.id,
          title: "Migration offer",
          slug: "migration-offer",
          summary: "Migration row.",
          currency: "USD",
          fromPrice: 0,
          occupancyBasisId: occupancy.id,
          mealPlanId: meal.id,
          transferIncluded: false,
          validFrom: new Date("2026-11-01T00:00:00.000Z"),
          validUntil: new Date("2026-11-30T00:00:00.000Z"),
          terms: "Migration row.",
        },
      });
    });
  }, /offer room type must belong to the offer resort/);

  await expectRejection(async () => {
    await db.$transaction(async (tx) => {
      const { item } = await createSentQuote(tx, actor.id);
      await tx.quoteItem.update({
        where: { id: item.id },
        data: { description: "Changed migration line" },
      });
    });
  }, /lines on a sent quote version cannot change/);

  try {
    await db.$transaction(async (tx) => {
      const { version } = await createSentQuote(tx, actor.id);
      const updated = await tx.quoteVersion.update({
        where: { id: version.id },
        data: { status: "EXPIRED" },
      });
      if (updated.status !== "EXPIRED") throw new Error("Status change to EXPIRED was rejected.");
      throw new Error("ROLLBACK_FIXTURE");
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("ROLLBACK_FIXTURE")) throw error;
  }

  await expectZeroRows("Fixture rollback");

  const target = await db.user.create({
    data: {
      email: "migration-staff@example.com",
      name: "Migration staff",
      passwordHash: "migration-placeholder-hash",
      status: "ACTIVE",
    },
  });
  await db.session.create({
    data: {
      sessionToken: "migration-session-token",
      userId: target.id,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  await assignRole({ actorId: actor.id, userId: target.id, role: "CONSULTANT" });
  const audit = await db.auditLog.findFirst({
    where: { action: "user.role.assign", entityId: target.id },
  });
  const session = await db.session.findUniqueOrThrow({
    where: { sessionToken: "migration-session-token" },
  });
  if (!audit || !session.revokedAt) {
    throw new Error("Role assignment did not write an audit row and revoke the session.");
  }

  const jobId = await enqueueJob({
    type: "email.deliver",
    payload: { template: "auth.magic-link", userId: actor.id },
    idempotencyKey: "migration-email-deliver",
  });
  const completed = await runDueJobs(1);
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  if (
    completed !== 1 ||
    job.status !== "FAILED" ||
    job.lastError !== "Email delivery is not configured."
  ) {
    throw new Error("Email job did not fail closed.");
  }

  console.log("Foundation exercise passed.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Foundation exercise failed.");
    await db.$disconnect();
    process.exit(1);
  });
