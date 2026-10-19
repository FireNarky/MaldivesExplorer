import { db } from "../src/lib/db";
import { readOwnQuote, readOwnThread } from "../src/modules/customers/records";
import { openAccount } from "../src/modules/customers/service";
import { submitEnquiry } from "../src/modules/enquiries/service";
import { emptyDraft, type PlannerDraft } from "../src/modules/enquiries/rules";
import { addNote, assignEnquiry } from "../src/modules/crm/service";
import { assignRole } from "../src/modules/identity/service";
import { runDueJobs } from "../src/jobs/worker";
import { mediaStorage } from "../src/modules/media/storage";
import {
  addItem,
  addSegment,
  approveVersion,
  createNextVersion,
  createQuote,
  expireDueQuotes,
  readQuote,
  respondToQuoteVersion,
  saveDraft,
  sendVersion,
  submitForReview,
} from "../src/modules/quotes/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the quote exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error("Quote exercise refused a database that is not disposable maldives_stage1.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

function plan(email: string, key: string): PlannerDraft {
  const draft = emptyDraft(key);
  draft.name = "Quote guest";
  draft.email = email;
  draft.consent = true;
  draft.adultCount = "2";
  draft.travelStart = "2026-12-01";
  draft.travelEnd = "2026-12-08";
  return draft;
}

async function issue(input: {
  enquiryReference: string;
  authorId: string;
  senderId: string;
  approverIds: string[];
  unit: string;
  description: string;
  expiresAt?: Date;
}): Promise<{ quoteId: string; versionId: string; itemId: string; reference: string }> {
  const created = await createQuote(input.authorId, input.enquiryReference);
  await saveDraft(input.authorId, created.quoteId, {
    welcome: "Your quote",
    overview: "Four nights",
    inclusions: "Breakfast",
    exclusions: "Flights",
    terms: "A consultant confirms any reservation with the resort.",
    expiresOn: "2026-12-31",
  });
  await addSegment(input.authorId, created.quoteId, {
    startDate: "2026-12-01",
    endDate: "2026-12-05",
    resortId: "",
    mealPlanId: "",
    transfer: "Speedboat",
    notes: "Arrive before noon",
  });
  await addItem(input.authorId, created.quoteId, {
    itemType: "ACCOMMODATION",
    description: input.description,
    quantity: "1",
    unitAmount: input.unit,
    taxAmount: "0.00",
    discountAmount: "0.00",
  });
  if (input.expiresAt) {
    await db.quoteVersion.update({
      where: { id: created.versionId },
      data: { expiresAt: input.expiresAt },
    });
  }
  await submitForReview(input.authorId, created.quoteId);
  for (const [index, approverId] of input.approverIds.entries()) {
    const result = await approveVersion(approverId, created.versionId);
    const finalStep = index === input.approverIds.length - 1;
    assert(
      result.status === (finalStep ? "APPROVED" : "IN_REVIEW"),
      "Approval stage was unexpected.",
    );
  }
  const sent = await sendVersion(input.senderId, created.versionId);
  assert(sent.replayed === false, "The first send was treated as a replay.");
  const item = await db.quoteItem.findFirstOrThrow({
    where: { quoteVersionId: created.versionId, description: input.description },
    select: { id: true },
  });
  return { ...created, itemId: item.id };
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const admin = await db.user.findUniqueOrThrow({
    where: { email: "migration-admin@example.com" },
  });
  const consultant = await db.user.create({
    data: { email: "quote-consultant@example.com", name: "Quote consultant", status: "ACTIVE" },
  });
  const other = await db.user.create({
    data: { email: "quote-other@example.com", name: "Other consultant", status: "ACTIVE" },
  });
  const approverA = await db.user.create({
    data: { email: "quote-approver-a@example.com", name: "Approver A", status: "ACTIVE" },
  });
  const approverB = await db.user.create({
    data: { email: "quote-approver-b@example.com", name: "Approver B", status: "ACTIVE" },
  });
  const operations = await db.user.create({
    data: { email: "quote-ops@example.com", name: "Quote operations", status: "ACTIVE" },
  });
  const guestA = await db.user.create({
    data: { email: "quote-guest-a@example.com", name: "Quote guest A", status: "ACTIVE" },
  });
  const guestB = await db.user.create({
    data: { email: "quote-guest-b@example.com", name: "Quote guest B", status: "ACTIVE" },
  });
  await assignRole({ actorId: admin.id, userId: consultant.id, role: "CONSULTANT" });
  await assignRole({ actorId: admin.id, userId: other.id, role: "CONSULTANT" });
  await assignRole({ actorId: admin.id, userId: approverA.id, role: "CONTENT_APPROVER" });
  await assignRole({ actorId: admin.id, userId: approverB.id, role: "CONTENT_APPROVER" });
  await assignRole({ actorId: admin.id, userId: operations.id, role: "OPERATIONS_MANAGER" });

  const first = await submitEnquiry(plan("quote-guest-a@example.com", "quote-plan-a"), {
    userId: guestA.id,
    ipHash: "quote-exercise",
    idempotencyKey: "quote-plan-a",
  });
  const second = await submitEnquiry(plan("quote-guest-b@example.com", "quote-plan-b"), {
    userId: guestB.id,
    ipHash: "quote-exercise",
    idempotencyKey: "quote-plan-b",
  });
  for (const reference of [first.reference, second.reference]) {
    const row = await db.enquiry.findUniqueOrThrow({
      where: { reference },
      select: { revision: true },
    });
    await assignEnquiry(
      admin.id,
      { reference },
      { userId: consultant.id, reason: "Quote exercise", revision: row.revision },
    );
  }
  const customerA = await openAccount(guestA.id);
  const customerB = await openAccount(guestB.id);

  await expectFailure(
    () => readQuote(consultant.id, "00000000-0000-4000-8000-000000000000"),
    /not available/,
  );
  const hidden = await createQuote(consultant.id, first.reference);
  assert((await readOwnQuote(guestA.id, hidden.versionId)) === null, "A draft was visible.");
  await expectFailure(() => readQuote(other.id, hidden.quoteId), /not available/);
  await expectFailure(() => createQuote(operations.id, first.reference), /not available/);

  const acceptQuote = await issue({
    enquiryReference: first.reference,
    authorId: consultant.id,
    senderId: consultant.id,
    approverIds: [approverA.id],
    unit: "100.00",
    description: "Lagoon stay",
  });
  const replay = await sendVersion(consultant.id, acceptQuote.versionId);
  assert(
    replay.replayed &&
      replay.pdfMediaId === (await sendVersion(consultant.id, acceptQuote.versionId)).pdfMediaId,
    "Send was not idempotent.",
  );
  const deliveries = await db.emailDelivery.count({
    where: { idempotencyKey: `quote.sent:${acceptQuote.versionId}` },
  });
  assert(deliveries === 1, "Send queued more than one email.");
  const delivery = await db.emailDelivery.findUniqueOrThrow({
    where: { idempotencyKey: `quote.sent:${acceptQuote.versionId}` },
  });
  assert(delivery.status === "QUEUED", "The quote email was marked sent.");
  const pdfMedia = await db.mediaAsset.findUniqueOrThrow({ where: { id: replay.pdfMediaId } });
  assert(
    pdfMedia.kind === "DOCUMENT" && pdfMedia.mimeType === "application/pdf",
    "The PDF was not stored.",
  );
  const pdf = await mediaStorage().get(pdfMedia.storageKey);
  const pdfText = new TextDecoder().decode(pdf ?? new Uint8Array());
  assert(pdfText.includes(acceptQuote.reference), "The PDF omitted the quote reference.");
  assert(pdfText.includes("Welcome") && pdfText.includes("Pricing"), "The PDF omitted a section.");
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const pending = await db.job.findUnique({
      where: { idempotencyKey: `quote.send:${acceptQuote.versionId}` },
      select: { status: true },
    });
    if (pending?.status === "SUCCEEDED") break;
    await runDueJobs(20);
  }
  const sendJob = await db.job.findUniqueOrThrow({
    where: { idempotencyKey: `quote.send:${acceptQuote.versionId}` },
  });
  assert(sendJob.status === "SUCCEEDED", "The quote send job did not finish.");
  const afterJob = await db.emailDelivery.findUniqueOrThrow({
    where: { idempotencyKey: `quote.sent:${acceptQuote.versionId}` },
  });
  assert(afterJob.status === "QUEUED", "The send job delivered the email.");

  assert(
    (await readOwnQuote(guestB.id, acceptQuote.versionId)) === null,
    "Another customer opened the quote.",
  );
  const before = await db.quoteResponse.count({ where: { quoteVersionId: acceptQuote.versionId } });
  const statusBefore = await db.quoteVersion.findUniqueOrThrow({
    where: { id: acceptQuote.versionId },
    select: { status: true },
  });
  await expectFailure(
    () =>
      respondToQuoteVersion({
        customerId: customerB.id,
        actorId: guestB.id,
        versionId: acceptQuote.versionId,
        responseType: "ACCEPT",
        message: "",
        idempotencyKey: "quote-b-accept",
      }),
    /not available/,
  );
  const afterAttempt = await db.quoteResponse.count({
    where: { quoteVersionId: acceptQuote.versionId },
  });
  const statusAfter = await db.quoteVersion.findUniqueOrThrow({
    where: { id: acceptQuote.versionId },
    select: { status: true },
  });
  assert(
    afterAttempt === before && statusAfter.status === statusBefore.status,
    "A foreign response changed the quote.",
  );

  const seen = await readOwnQuote(guestA.id, acceptQuote.versionId);
  assert(seen?.canAccept === true, "The owner could not accept a sent quote.");
  const accepted = await respondToQuoteVersion({
    customerId: customerA.id,
    actorId: guestA.id,
    versionId: acceptQuote.versionId,
    responseType: "ACCEPT",
    message: "Please proceed",
    idempotencyKey: "quote-accept-ok",
  });
  const acceptedAgain = await respondToQuoteVersion({
    customerId: customerA.id,
    actorId: guestA.id,
    versionId: acceptQuote.versionId,
    responseType: "ACCEPT",
    message: "Please proceed",
    idempotencyKey: "quote-accept-ok",
  });
  assert(accepted.responseId === acceptedAgain.responseId, "Accept was not idempotent.");
  assert(
    (await db.quoteResponse.count({
      where: { quoteVersionId: acceptQuote.versionId, responseType: "ACCEPT" },
    })) === 1,
    "Accept wrote two responses.",
  );
  await expectFailure(
    () =>
      respondToQuoteVersion({
        customerId: customerA.id,
        actorId: guestA.id,
        versionId: acceptQuote.versionId,
        responseType: "DECLINE",
        message: "",
        idempotencyKey: "quote-accept-second",
      }),
    /already has a response|cannot be accepted/,
  );

  const declineQuote = await issue({
    enquiryReference: first.reference,
    authorId: consultant.id,
    senderId: consultant.id,
    approverIds: [approverA.id],
    unit: "80.00",
    description: "Garden stay",
  });
  const declined = await respondToQuoteVersion({
    customerId: customerA.id,
    actorId: guestA.id,
    versionId: declineQuote.versionId,
    responseType: "DECLINE",
    message: "The dates do not work",
    idempotencyKey: "quote-decline-ok",
  });
  assert(declined.status === "DECLINED", "Decline did not record the status.");
  await expectFailure(
    () =>
      respondToQuoteVersion({
        customerId: customerA.id,
        actorId: guestA.id,
        versionId: declineQuote.versionId,
        responseType: "DECLINE",
        message: "Again",
        idempotencyKey: "quote-decline-two",
      }),
    /already has a response|cannot be accepted/,
  );

  await expectFailure(
    () =>
      db.quoteItem.update({
        where: { id: acceptQuote.itemId },
        data: { description: "Changed stay" },
      }),
    /lines on a sent quote version cannot change/,
  );
  const versioned = await issue({
    enquiryReference: first.reference,
    authorId: consultant.id,
    senderId: consultant.id,
    approverIds: [approverA.id],
    unit: "90.00",
    description: "Versioned stay",
  });
  const next = await createNextVersion(consultant.id, versioned.quoteId);
  await addItem(consultant.id, versioned.quoteId, {
    itemType: "FEE",
    description: "Extra transfer",
    quantity: "1",
    unitAmount: "25.00",
    taxAmount: "0.00",
    discountAmount: "0.00",
  });
  const original = await db.quoteItem.findUniqueOrThrow({ where: { id: versioned.itemId } });
  assert(original.description === "Versioned stay", "A sent line changed.");
  assert(next.versionId !== versioned.versionId, "A commercial change reused the sent version.");
  await submitForReview(consultant.id, versioned.quoteId);
  await approveVersion(approverB.id, next.versionId);
  await sendVersion(consultant.id, next.versionId);
  const superseded = await db.quoteVersion.findUniqueOrThrow({
    where: { id: versioned.versionId },
  });
  assert(superseded.status === "SUPERSEDED", "The earlier sent version stayed current.");

  const high = await createQuote(consultant.id, first.reference);
  await saveDraft(consultant.id, high.quoteId, {
    welcome: "High total",
    overview: "",
    inclusions: "",
    exclusions: "",
    terms: "Two approvers are required for this total.",
    expiresOn: "2026-12-31",
  });
  await addItem(consultant.id, high.quoteId, {
    itemType: "ACCOMMODATION",
    description: "High season stay",
    quantity: "1",
    unitAmount: "30000.00",
    taxAmount: "0.00",
    discountAmount: "0.00",
  });
  await submitForReview(consultant.id, high.quoteId);
  await expectFailure(() => approveVersion(consultant.id, high.versionId), /cannot approve/);
  const firstApproval = await approveVersion(approverA.id, high.versionId);
  assert(
    firstApproval.status === "IN_REVIEW" && firstApproval.stage === "first",
    "One approver finished a high total.",
  );
  await expectFailure(() => approveVersion(approverA.id, high.versionId), /second approver/);
  const finalApproval = await approveVersion(approverB.id, high.versionId);
  assert(finalApproval.status === "APPROVED", "The second approver did not finish the quote.");
  await expectFailure(
    () => sendVersion(approverB.id, high.versionId),
    /cannot send|approver cannot send/,
  );
  await sendVersion(consultant.id, high.versionId);

  const self = await createQuote(admin.id, first.reference);
  await saveDraft(admin.id, self.quoteId, {
    welcome: "Admin draft",
    overview: "",
    inclusions: "",
    exclusions: "",
    terms: "Prepared by the same person who would approve it.",
    expiresOn: "2026-12-31",
  });
  await addItem(admin.id, self.quoteId, {
    itemType: "OTHER",
    description: "Planning fee",
    quantity: "1",
    unitAmount: "50.00",
    taxAmount: "0.00",
    discountAmount: "0.00",
  });
  await submitForReview(admin.id, self.quoteId);
  await expectFailure(() => approveVersion(admin.id, self.versionId), /cannot approve/);

  const expiring = await issue({
    enquiryReference: second.reference,
    authorId: consultant.id,
    senderId: consultant.id,
    approverIds: [approverA.id],
    unit: "60.00",
    description: "Short validity",
    expiresAt: new Date(Date.now() + 20000),
  });
  await new Promise((resolve) => setTimeout(resolve, 21000));
  await expectFailure(
    () =>
      respondToQuoteVersion({
        customerId: customerB.id,
        actorId: guestB.id,
        versionId: expiring.versionId,
        responseType: "ACCEPT",
        message: "",
        idempotencyKey: "quote-expire-accept",
      }),
    /expired/,
  );
  const expiredCount = await expireDueQuotes();
  assert(expiredCount >= 1, "Expiry did not mark the sent quote.");
  const expired = await db.quoteVersion.findUniqueOrThrow({ where: { id: expiring.versionId } });
  assert(expired.status === "EXPIRED", "The overdue quote stayed sent.");
  assert((await expireDueQuotes()) === 0, "Expiry was not idempotent.");
  await db.job.update({
    where: { idempotencyKey: `quote.expire:${expiring.versionId}` },
    data: { runAt: new Date(Date.now() - 1000) },
  });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const pending = await db.job.findUnique({
      where: { idempotencyKey: `quote.expire:${expiring.versionId}` },
      select: { status: true },
    });
    if (pending?.status === "SUCCEEDED" || pending?.status === "FAILED") break;
    await runDueJobs(20);
  }
  const expireJob = await db.job.findUniqueOrThrow({
    where: { idempotencyKey: `quote.expire:${expiring.versionId}` },
  });
  assert(expireJob.status === "SUCCEEDED", "The expiry job failed.");
  await expectFailure(
    () =>
      respondToQuoteVersion({
        customerId: customerB.id,
        actorId: guestB.id,
        versionId: expiring.versionId,
        responseType: "ACCEPT",
        message: "",
        idempotencyKey: "quote-expire-again",
      }),
    /cannot be accepted/,
  );

  await addNote(consultant.id, first.reference, {
    body: "quote-internal-note",
    visibility: "INTERNAL",
  });
  const thread = await readOwnThread(guestA.id, first.reference);
  assert(
    thread !== null && !thread.entries.some((entry) => entry.body.includes("quote-internal-note")),
    "An internal note reached the customer.",
  );

  const audits = await db.auditLog.count({
    where: {
      entityId: acceptQuote.versionId,
      action: { in: ["quote.send", "quote.response", "quote.status", "quote.approve"] },
    },
  });
  assert(audits >= 4, "Quote actions were not audited.");
  console.log("Quote exercise passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
