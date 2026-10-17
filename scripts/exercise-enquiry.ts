import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { runDueJobs } from "../src/jobs/worker";
import { EnquiryError, submitEnquiry } from "../src/modules/enquiries/service";
import { emptyDraft, type PlannerDraft } from "../src/modules/enquiries/rules";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the enquiry exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error("Enquiry exercise refused a database that is not disposable maldives_stage1.");
  }
}

async function expectFailure(run: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (error instanceof EnquiryError && pattern.test(error.message)) return;
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
    if (rows.length !== 0) throw new Error(`Enquiry exercise left ${rows.length} integrity rows.`);
  }
}

function plan(email: string, key: string, resortIds: string[]): PlannerDraft {
  const draft = emptyDraft(key);
  draft.name = "Enquiry guest";
  draft.email = email;
  draft.consent = true;
  draft.adultCount = "2";
  draft.childAges = ["1", "8"];
  draft.travelStart = "2026-06-01";
  draft.travelEnd = "2026-06-08";
  draft.budgetMin = "1000";
  draft.budgetMax = "2000";
  draft.resortIds = resortIds;
  draft.phone = "7000000";
  draft.countryCode = "mv";
  draft.source = "exercise";
  draft.landingPath = "/resorts/wishlist-exercise-resort";
  return draft;
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const published = await db.resort.findUniqueOrThrow({
    where: { slug: "wishlist-exercise-resort" },
  });
  const hidden = await db.resort.findUniqueOrThrow({ where: { slug: "wishlist-draft-token" } });
  const missing = "11111111-1111-4111-8111-111111111111";
  const firstKey = "enquiry-exercise-1";
  const first = await submitEnquiry(
    plan("enquiry-guest@example.com", firstKey, [published.id, hidden.id, missing]),
    { userId: null, ipHash: "exercise", idempotencyKey: firstKey },
  );
  if (!first.created || !/^ME-E-\d{6}$/.test(first.reference)) {
    throw new Error("The enquiry was not created with a reference.");
  }
  const enquiry = await db.enquiry.findUniqueOrThrow({
    where: { idempotencyKey: firstKey },
    include: { travelers: true, resorts: true, offers: true, interests: true, statusHistory: true },
  });
  if (enquiry.resorts.length !== 1 || enquiry.resorts[0]?.resortId !== published.id) {
    throw new Error("An unpublished or missing resort was attached.");
  }
  if (enquiry.adultCount !== 2 || enquiry.childCount !== 2) {
    throw new Error("The party was not stored.");
  }
  const infant = enquiry.travelers.find((row) => row.ageAtArrival === 1);
  const child = enquiry.travelers.find((row) => row.ageAtArrival === 8);
  if (infant?.travelerType !== "INFANT" || child?.travelerType !== "CHILD") {
    throw new Error("Child ages were not classified.");
  }
  if (enquiry.statusHistory.length !== 1 || enquiry.statusHistory[0]?.toStatus !== "NEW") {
    throw new Error("The opening status was not recorded.");
  }
  if (
    enquiry.source !== "exercise" ||
    enquiry.landingPath !== "/resorts/wishlist-exercise-resort"
  ) {
    throw new Error("Attribution was not stored.");
  }
  const customer = await db.customer.findUniqueOrThrow({
    where: { email: "enquiry-guest@example.com" },
  });
  if (customer.userId || customer.countryCode !== "MV") {
    throw new Error("The customer match did not keep an unlinked customer.");
  }
  const consent = await db.consentRecord.findFirst({
    where: { subjectId: customer.id, purpose: "ENQUIRY_CONTACT", status: "GRANTED" },
  });
  if (!consent) throw new Error("Contact consent was not recorded.");
  const delivery = await db.emailDelivery.findFirst({
    where: { relatedId: enquiry.id, templateCode: "enquiry.received", status: "QUEUED" },
  });
  if (!delivery || delivery.classification !== "TRANSACTIONAL") {
    throw new Error("The acknowledgement was not queued.");
  }
  const job = await db.job.findUniqueOrThrow({
    where: { idempotencyKey: `enquiry.received:${enquiry.id}` },
  });
  const payload = job.payload;
  const payloadText = JSON.stringify(payload);
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.claimRequired !== true ||
    payloadText.includes("claim=") ||
    "claimUrl" in payload
  ) {
    throw new Error("The acknowledgement job stored a claim token.");
  }
  const storedClaim = await db.verificationToken.count({
    where: { identifier: "claim:enquiry-guest@example.com" },
  });
  if (storedClaim !== 0) throw new Error("A claim token was stored before delivery.");
  const audits = await db.auditLog.findMany({
    where: { entityType: "enquiry", entityId: enquiry.id },
  });
  if (JSON.stringify(audits).includes("claim=")) {
    throw new Error("An audit row stored a claim token.");
  }
  const replay = await submitEnquiry(
    plan("enquiry-guest@example.com", firstKey, [published.id, hidden.id, missing]),
    { userId: null, ipHash: "exercise", idempotencyKey: firstKey },
  );
  if (replay.created || replay.reference !== first.reference) {
    throw new Error("A repeated submission created another enquiry.");
  }
  const second = await submitEnquiry(
    plan("enquiry-guest@example.com", "enquiry-exercise-2", [published.id]),
    { userId: null, ipHash: "exercise", idempotencyKey: "enquiry-exercise-2" },
  );
  if (!second.duplicate) throw new Error("An overlapping open plan was not flagged.");
  const customers = await db.customer.count({ where: { email: "enquiry-guest@example.com" } });
  if (customers !== 1) throw new Error("The same email created a second customer.");
  await expectFailure(
    () =>
      submitEnquiry(plan("other-guest@example.com", firstKey, []), {
        userId: null,
        ipHash: "exercise",
        idempotencyKey: firstKey,
      }),
    /different plan/i,
  );
  const completed = await runDueJobs(5);
  if (completed < 2) throw new Error("The acknowledgement jobs did not run.");
  const afterJob = await db.emailDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
  if (afterJob.status === "SENT" || afterJob.providerId) {
    throw new Error("The queued message was marked sent without a provider.");
  }
  if (afterJob.status !== "FAILED") throw new Error("The provider refusal was not recorded.");
  const claimAfter = await db.verificationToken.count({
    where: { identifier: "claim:enquiry-guest@example.com" },
  });
  if (claimAfter !== 0) throw new Error("A refused delivery left a claim token.");
  await expectIntegrity();
  console.log("Enquiry exercise passed.");
  await db.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : "Enquiry exercise failed.");
  await db.$disconnect();
  process.exitCode = 1;
});
