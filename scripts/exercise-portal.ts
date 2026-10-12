import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import type { Prisma } from "@prisma/client";
import { runDueJobs } from "../src/jobs/worker";
import { PortalError } from "../src/modules/customers/service";
import {
  listOwnEnquiries,
  postOwnMessage,
  readOwnEnquiry,
  readOwnQuote,
  readOwnThread,
} from "../src/modules/customers/records";
import {
  readConsent,
  readProfile,
  redeemClaim,
  requestPrivacy,
  saveConsent,
  updateProfile,
} from "../src/modules/customers/service";
import { submitEnquiry } from "../src/modules/enquiries/service";
import { emptyDraft, type PlannerDraft } from "../src/modules/enquiries/rules";
import { addSavedItem, listSavedItems } from "../src/modules/wishlist/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the portal exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error("Portal exercise refused a database that is not disposable maldives_stage1.");
  }
}

async function expectFailure(run: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (error instanceof PortalError && pattern.test(error.message)) return;
    const message = error instanceof Error ? error.message : "";
    if (pattern.test(message)) return;
    throw error;
  }
  throw new Error(`Expected a rejection matching ${pattern.source}.`);
}

function plan(email: string, key: string): PlannerDraft {
  const draft = emptyDraft(key);
  draft.name = "Portal guest";
  draft.email = email;
  draft.consent = true;
  draft.adultCount = "2";
  draft.childAges = ["1", "8"];
  draft.travelStart = "2026-12-01";
  draft.travelEnd = "2026-12-08";
  draft.budgetMin = "1500";
  draft.budgetMax = "4000";
  return draft;
}

async function quoteReference(tx: Prisma.TransactionClient): Promise<string> {
  const [sequence] = await tx.$queryRaw<Array<{ n: bigint }>>`
    SELECT nextval('quote_reference_seq') AS n
  `;
  return `ME-Q-${String(sequence?.n ?? 0n).padStart(6, "0")}`;
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const userA = await db.user.create({
    data: { name: "Portal A", email: "portal-a@example.com", status: "ACTIVE" },
  });
  const userB = await db.user.create({
    data: { name: "Portal B", email: "portal-b@example.com", status: "ACTIVE" },
  });
  const first = await submitEnquiry(plan("portal-a@example.com", "portal-a-1"), {
    userId: userA.id,
    ipHash: "exercise",
    idempotencyKey: "portal-a-1",
  });
  const second = await submitEnquiry(plan("portal-b@example.com", "portal-b-1"), {
    userId: userB.id,
    ipHash: "exercise",
    idempotencyKey: "portal-b-1",
  });
  const enquiryA = await db.enquiry.findUniqueOrThrow({ where: { reference: first.reference } });
  const enquiryB = await db.enquiry.findUniqueOrThrow({ where: { reference: second.reference } });
  const resort = await db.resort.findUniqueOrThrow({ where: { slug: "wishlist-exercise-resort" } });
  await addSavedItem(userA.id, "RESORT", resort.id);
  const savedForB = await listSavedItems(userB.id);
  if (savedForB.some((item) => item.entityId === resort.id)) {
    throw new Error("Another account could read the saved resort.");
  }

  const sent = await db.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: { enquiryId: enquiryA.id, reference: await quoteReference(tx) },
    });
    const version = await tx.quoteVersion.create({
      data: {
        quoteId: quote.id,
        versionNo: 1,
        currency: "USD",
        subtotal: "100.00",
        taxTotal: "0.00",
        feeTotal: "0.00",
        discountTotal: "0.00",
        grandTotal: "100.00",
        termsSnapshot: "Exercise terms.",
        welcomeMessage: "Exercise welcome.",
        overview: "Exercise overview.",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        status: "DRAFT",
        createdById: userA.id,
      },
    });
    await tx.quoteItem.create({
      data: {
        quoteVersionId: version.id,
        itemType: "ACCOMMODATION",
        description: "Exercise stay",
        quantity: "1.00",
        unitAmount: "100.00",
        taxAmount: "0.00",
        discountAmount: "0.00",
        lineTotal: "100.00",
        sortOrder: 0,
      },
    });
    await tx.itinerarySegment.create({
      data: {
        quoteVersionId: version.id,
        sortOrder: 0,
        resortId: resort.id,
        startDate: new Date("2026-12-01T00:00:00.000Z"),
        endDate: new Date("2026-12-08T00:00:00.000Z"),
        transferSummary: "Exercise transfer",
      },
    });
    await tx.quoteVersion.update({
      where: { id: version.id },
      data: { status: "SENT", sentAt: new Date("2026-10-12T00:00:00.000Z") },
    });
    await tx.quote.update({ where: { id: quote.id }, data: { activeVersionId: version.id } });
    const draftQuote = await tx.quote.create({
      data: { enquiryId: enquiryA.id, reference: await quoteReference(tx) },
    });
    const draft = await tx.quoteVersion.create({
      data: {
        quoteId: draftQuote.id,
        versionNo: 1,
        currency: "USD",
        subtotal: "0.00",
        taxTotal: "0.00",
        feeTotal: "0.00",
        discountTotal: "0.00",
        grandTotal: "0.00",
        termsSnapshot: "Draft terms.",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        status: "DRAFT",
        createdById: userA.id,
      },
    });
    const otherQuote = await tx.quote.create({
      data: { enquiryId: enquiryB.id, reference: await quoteReference(tx) },
    });
    const other = await tx.quoteVersion.create({
      data: {
        quoteId: otherQuote.id,
        versionNo: 1,
        currency: "USD",
        subtotal: "0.00",
        taxTotal: "0.00",
        feeTotal: "0.00",
        discountTotal: "0.00",
        grandTotal: "0.00",
        termsSnapshot: "Other terms.",
        welcomeMessage: "Other welcome.",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        status: "SENT",
        sentAt: new Date("2026-10-12T00:00:00.000Z"),
        createdById: userB.id,
      },
    });
    return { sentId: version.id, draftId: draft.id, otherId: other.id, reference: quote.reference };
  });

  const ownList = await listOwnEnquiries(userA.id);
  if (ownList.length !== 1 || ownList[0]?.reference !== first.reference) {
    throw new Error("The account list included another customer's plan.");
  }
  if (await readOwnEnquiry(userA.id, second.reference)) {
    throw new Error("Another customer's plan was readable.");
  }
  const detail = await readOwnEnquiry(userA.id, first.reference);
  if (!detail || detail.quotes.length !== 1 || detail.quotes[0]?.id !== sent.sentId) {
    throw new Error("The draft quote was exposed.");
  }
  if (detail.childAges.join(",") !== "1,8")
    throw new Error("Child ages were not shown to the owner.");
  const ownQuote = await readOwnQuote(userA.id, sent.sentId);
  if (
    !ownQuote ||
    ownQuote.grandTotal !== "USD 100.00" ||
    ownQuote.welcome !== "Exercise welcome."
  ) {
    throw new Error("The sent quote was not readable by its owner.");
  }
  if (await readOwnQuote(userA.id, sent.draftId)) throw new Error("A draft quote was readable.");
  if (await readOwnQuote(userA.id, sent.otherId)) {
    throw new Error("Another customer's quote was readable.");
  }
  if ((await readOwnQuote(userB.id, sent.sentId)) !== null) {
    throw new Error("The quote was readable by another customer.");
  }

  await db.note.create({
    data: {
      enquiryId: enquiryA.id,
      authorId: userA.id,
      visibility: "INTERNAL",
      body: "internal-secret",
    },
  });
  await db.note.create({
    data: {
      enquiryId: enquiryA.id,
      authorId: userA.id,
      visibility: "CUSTOMER",
      body: "customer-visible-note",
    },
  });
  await db.message.create({
    data: {
      enquiryId: enquiryB.id,
      senderType: "CUSTOMER",
      customerSenderId: enquiryB.customerId,
      body: "private-b-message",
    },
  });
  const before = await db.message.count({ where: { enquiryId: enquiryB.id } });
  await expectFailure(
    () => postOwnMessage(userA.id, second.reference, "cross-account"),
    /not available/,
  );
  const after = await db.message.count({ where: { enquiryId: enquiryB.id } });
  if (before !== after) throw new Error("A message was stored on another customer's plan.");
  await postOwnMessage(userA.id, first.reference, "Owner message");
  const thread = await readOwnThread(userA.id, first.reference);
  const bodies = thread?.entries.map((entry) => entry.body) ?? [];
  if (!bodies.includes("Owner message") || !bodies.includes("customer-visible-note")) {
    throw new Error("The owner thread missed a message.");
  }
  if (bodies.includes("internal-secret") || bodies.includes("private-b-message")) {
    throw new Error("A private note or another customer's message was returned.");
  }
  if (await readOwnThread(userA.id, second.reference)) {
    throw new Error("Another customer's messages were readable.");
  }
  if ((await db.quoteResponse.count()) !== 0) {
    throw new Error("A quote response was created.");
  }

  await updateProfile(userA.id, {
    name: "Portal A updated",
    phone: "+960 7000000",
    countryCode: "mv",
  });
  const profile = await readProfile(userA.id);
  if (profile.name !== "Portal A updated" || profile.countryCode !== "MV") {
    throw new Error("The profile was not saved.");
  }
  if (profile.email !== "portal-a@example.com") throw new Error("The account email changed.");
  await saveConsent(userA.id, { ANALYTICS: true }, "exercise");
  await saveConsent(userA.id, { ANALYTICS: false }, "exercise");
  const consent = await readConsent(userA.id);
  if (consent.find((choice) => choice.purpose === "ANALYTICS")?.status !== "WITHDRAWN") {
    throw new Error("Consent was not withdrawn.");
  }
  const analyticsRows = await db.consentRecord.count({
    where: { subjectId: profile.customerId, purpose: "ANALYTICS" },
  });
  if (analyticsRows !== 2) throw new Error("Consent was updated in place.");

  await requestPrivacy(userA.id, "export");
  await requestPrivacy(userA.id, "deletion");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await runDueJobs(10);
    const ready = await db.job.count({
      where: { type: { in: ["privacy.export", "privacy.deletion"] }, status: "SUCCEEDED" },
    });
    if (ready >= 2) break;
  }
  const privacyJobs = await db.job.count({
    where: { type: { in: ["privacy.export", "privacy.deletion"] }, status: "SUCCEEDED" },
  });
  if (privacyJobs < 2) throw new Error("The privacy jobs did not finish.");
  const customer = await db.customer.findUnique({ where: { userId: userA.id } });
  const user = await db.user.findUnique({ where: { id: userA.id } });
  if (!customer || !user || customer.email !== "portal-a@example.com") {
    throw new Error("A privacy request removed the account.");
  }

  const claimed = await submitEnquiry(plan("portal-claim@example.com", "portal-claim-1"), {
    userId: null,
    ipHash: "exercise",
    idempotencyKey: "portal-claim-1",
  });
  const claimUser = await db.user.create({
    data: { name: "Portal Claim", email: "portal-claim@example.com", status: "ACTIVE" },
  });
  const raw = randomBytes(32).toString("base64url");
  const hashed = createHash("sha256").update(raw).digest("hex");
  await db.verificationToken.create({
    data: {
      identifier: "claim:portal-claim@example.com",
      token: hashed,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const mismatch = await redeemClaim(userB.id, raw);
  if (mismatch.linked) throw new Error("A claim link was used by another email.");
  const linked = await redeemClaim(claimUser.id, raw);
  if (!linked.linked) throw new Error("The claim link did not link the plan.");
  const claimedList = await listOwnEnquiries(claimUser.id);
  if (!claimedList.some((row) => row.reference === claimed.reference)) {
    throw new Error("The claimed plan is missing from the account.");
  }
  if (await db.verificationToken.findUnique({ where: { token: hashed } })) {
    throw new Error("The claim token was kept after use.");
  }

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
    if (rows.length !== 0) throw new Error(`Portal exercise left ${rows.length} integrity rows.`);
  }
  console.log("Portal exercise passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
