import { readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { postOwnMessage, readOwnQuote } from "../src/modules/customers/records";

function assertDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_restore"
  ) {
    throw new Error("Restore verification refused a database that is not maldives_restore.");
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

async function expectRejection(run: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (pattern.test(message)) return;
    throw error;
  }
  throw new Error(`Expected a rejection matching ${pattern.source}.`);
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
      name: "Restore atoll",
      slug: "restore-atoll",
      summary: "Restore row.",
      description: "Restore row.",
    },
  });
  const island = await tx.island.create({
    data: {
      atollId: atoll.id,
      name: "Restore island",
      slug: "restore-island",
      islandType: "RESORT",
      summary: "Restore row.",
      description: "Restore row.",
    },
  });
  const resortA = await tx.resort.create({
    data: {
      islandId: island.id,
      name: "Restore resort a",
      slug: "restore-resort-a",
      summary: "Restore row.",
      description: "Restore row.",
    },
  });
  const resortB = await tx.resort.create({
    data: {
      islandId: island.id,
      name: "Restore resort b",
      slug: "restore-resort-b",
      summary: "Restore row.",
      description: "Restore row.",
    },
  });
  const room = await tx.roomType.create({
    data: {
      resortId: resortB.id,
      categoryId: category.id,
      name: "Restore room",
      slug: "restore-room",
      description: "Restore row.",
      maxAdults: 2,
    },
  });
  return { meal, occupancy, resortA, room };
}

async function main(): Promise<void> {
  assertDatabase();
  for (const statement of statements()) {
    const rows = await db.$queryRawUnsafe<unknown[]>(statement);
    if (rows.length !== 0) throw new Error(`Integrity assertion returned ${rows.length} rows.`);
  }
  const actor = await db.user.findFirstOrThrow({
    where: { email: { not: "" } },
    select: { id: true },
  });

  await expectRejection(async () => {
    await db.$transaction(async (tx) => {
      const { meal, occupancy, resortA, room } = await createResortPair(tx);
      await tx.offer.create({
        data: {
          resortId: resortA.id,
          roomTypeId: room.id,
          title: "Restore offer",
          slug: "restore-offer",
          summary: "Restore row.",
          currency: "USD",
          fromPrice: 0,
          occupancyBasisId: occupancy.id,
          mealPlanId: meal.id,
          transferIncluded: false,
          validFrom: new Date("2026-11-01T00:00:00.000Z"),
          validUntil: new Date("2026-11-30T00:00:00.000Z"),
          terms: "Restore row.",
        },
      });
    });
  }, /offer room type must belong to the offer resort/);

  const sent = await db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: { name: "Restore customer", email: "restore-customer@example.com" },
    });
    const enquiry = await tx.enquiry.create({
      data: {
        reference: "ME-E-910001",
        customerId: customer.id,
        adultCount: 1,
        submittedSnapshot: { source: "restore" },
        idempotencyKey: "restore-enquiry",
      },
    });
    const quote = await tx.quote.create({
      data: { enquiryId: enquiry.id, reference: "ME-Q-910001" },
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
        termsSnapshot: "Restore row.",
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
        createdById: actor.id,
      },
    });
    const item = await tx.quoteItem.create({
      data: {
        quoteVersionId: version.id,
        itemType: "OTHER",
        description: "Restore line",
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
    return item.id;
  });
  await expectRejection(
    () =>
      db.quoteItem.update({ where: { id: sent }, data: { description: "Changed restore line" } }),
    /lines on a sent quote version cannot change/,
  );

  const imported = await db.review.create({
    data: {
      sourceType: "IMPORTED",
      sourceReference: "Restore extract",
      displayName: "Restore score",
      rating: "4.0",
      ratingBasis: "Published third-party score",
      body: "A restored imported rating.",
      verificationStatus: "UNVERIFIED",
      consentStatus: "GRANTED",
      moderationStatus: "APPROVED",
      featured: false,
    },
    select: { id: true },
  });
  await expectRejection(
    () => db.review.update({ where: { id: imported.id }, data: { featured: true } }),
    /featured/,
  );

  const owner = await db.user.create({
    data: { email: "restore-owner@example.com", name: "Restore owner", status: "ACTIVE" },
  });
  const other = await db.user.create({
    data: { email: "restore-other@example.com", name: "Restore other", status: "ACTIVE" },
  });
  const ownerCustomer = await db.customer.create({
    data: { userId: owner.id, name: owner.name, email: owner.email },
  });
  const otherCustomer = await db.customer.create({
    data: { userId: other.id, name: other.name, email: other.email },
  });
  const ownerEnquiry = await db.enquiry.create({
    data: {
      reference: "ME-E-910002",
      customerId: ownerCustomer.id,
      adultCount: 1,
      submittedSnapshot: { source: "restore" },
      idempotencyKey: "restore-owner",
    },
  });
  const otherEnquiry = await db.enquiry.create({
    data: {
      reference: "ME-E-910003",
      customerId: otherCustomer.id,
      adultCount: 1,
      submittedSnapshot: { source: "restore" },
      idempotencyKey: "restore-other",
    },
  });
  const ownerQuote = await db.quote.create({
    data: { enquiryId: ownerEnquiry.id, reference: "ME-Q-910002" },
  });
  const otherQuote = await db.quote.create({
    data: { enquiryId: otherEnquiry.id, reference: "ME-Q-910003" },
  });
  const ownerVersion = await db.quoteVersion.create({
    data: {
      quoteId: ownerQuote.id,
      versionNo: 1,
      currency: "USD",
      subtotal: 10,
      taxTotal: 0,
      feeTotal: 0,
      discountTotal: 0,
      grandTotal: 10,
      termsSnapshot: "Owner terms.",
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      status: "SENT",
      sentAt: new Date("2026-10-12T00:00:00.000Z"),
      createdById: actor.id,
    },
  });
  const otherVersion = await db.quoteVersion.create({
    data: {
      quoteId: otherQuote.id,
      versionNo: 1,
      currency: "USD",
      subtotal: 20,
      taxTotal: 0,
      feeTotal: 0,
      discountTotal: 0,
      grandTotal: 20,
      termsSnapshot: "Other terms.",
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      status: "SENT",
      sentAt: new Date("2026-10-12T00:00:00.000Z"),
      createdById: actor.id,
    },
  });
  const own = await readOwnQuote(owner.id, ownerVersion.id);
  const cross = await readOwnQuote(owner.id, otherVersion.id);
  if (!own || cross) throw new Error("Restored quote ownership did not hold.");
  await db.message.create({
    data: {
      enquiryId: otherEnquiry.id,
      senderType: "CUSTOMER",
      customerSenderId: otherCustomer.id,
      body: "private-restore-message",
    },
  });
  const before = await db.message.count({ where: { enquiryId: otherEnquiry.id } });
  await expectRejection(
    () => postOwnMessage(owner.id, otherEnquiry.reference, "cross-account"),
    /not available/,
  );
  const after = await db.message.count({ where: { enquiryId: otherEnquiry.id } });
  if (before !== after)
    throw new Error("A restored message was stored on another customer's plan.");
  console.log("Restore verification passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Restore verification failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
