import { db } from "../src/lib/db";
import { runDueJobs } from "../src/jobs/worker";
import { submitEnquiry } from "../src/modules/enquiries/service";
import { emptyDraft, type PlannerDraft } from "../src/modules/enquiries/rules";
import { assignRole } from "../src/modules/identity/service";
import { analyticsReport, operationalReport } from "../src/modules/analytics/service";
import { recordProductEvent } from "../src/modules/analytics/service";
import {
  confirmNewsletter,
  currentNoticeVersion,
  exportSubscriptions,
  importSubscriptions,
  listSubscriptions,
  subscribeNewsletter,
  suppressSubscription,
  unsubscribeNewsletter,
} from "../src/modules/newsletter/service";
import {
  createReview,
  featureReview,
  listPublishedForResort,
  listTestimonials,
  publishReview,
  updateReview,
} from "../src/modules/reviews/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the stage 9 exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error("Stage 9 exercise refused a database that is not disposable maldives_stage1.");
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
  draft.name = "Stage nine guest";
  draft.email = email;
  draft.consent = true;
  draft.adultCount = "2";
  draft.travelStart = "2026-12-01";
  draft.travelEnd = "2026-12-08";
  return draft;
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const admin = await db.user.findUniqueOrThrow({
    where: { email: "migration-admin@example.com" },
  });
  const editor = await db.user.create({
    data: { email: "stage9-editor@example.com", name: "Stage 9 editor", status: "ACTIVE" },
  });
  const approver = await db.user.create({
    data: { email: "stage9-approver@example.com", name: "Stage 9 approver", status: "ACTIVE" },
  });
  const operations = await db.user.create({
    data: { email: "stage9-ops@example.com", name: "Stage 9 operations", status: "ACTIVE" },
  });
  const consultant = await db.user.create({
    data: { email: "stage9-consultant@example.com", name: "Stage 9 consultant", status: "ACTIVE" },
  });
  await assignRole({ actorId: admin.id, userId: editor.id, role: "CONTENT_EDITOR" });
  await assignRole({ actorId: admin.id, userId: approver.id, role: "CONTENT_APPROVER" });
  await assignRole({ actorId: admin.id, userId: operations.id, role: "OPERATIONS_MANAGER" });
  await assignRole({ actorId: admin.id, userId: consultant.id, role: "CONSULTANT" });

  const editorialId = await createReview(editor.id, {
    resortId: "",
    sourceType: "EDITORIAL",
    sourceReference: "Desk note 2026-10",
    displayName: "A guest",
    rating: "",
    ratingBasis: "",
    body: "The transfer notes were clear.",
    consent: true,
  });
  await expectFailure(
    () =>
      updateReview(editor.id, editorialId, {
        resortId: "",
        sourceType: "FIRST_PARTY",
        sourceReference: "Desk note 2026-10",
        displayName: "A guest",
        rating: "",
        ratingBasis: "",
        body: "The transfer notes were clear.",
        consent: true,
      }),
    /source/,
  );
  const preserved = await db.review.findUniqueOrThrow({ where: { id: editorialId } });
  assert(preserved.sourceType === "EDITORIAL", "The review source changed.");
  assert(preserved.verificationStatus === "UNVERIFIED", "The verification state changed.");
  await expectFailure(() => publishReview(editor.id, editorialId), /not available/);
  await publishReview(approver.id, editorialId);
  await featureReview(approver.id, editorialId, true);
  const testimonials = await listTestimonials();
  assert(
    testimonials.some((item) => item.id === editorialId && item.label === "Editorial"),
    "The published editorial note was not listed.",
  );
  assert(
    testimonials.every((item) => !item.label.includes("Verified")),
    "A public review used the word Verified.",
  );

  const importedId = await createReview(editor.id, {
    resortId: "",
    sourceType: "IMPORTED",
    sourceReference: "External extract",
    displayName: "External score",
    rating: "4.0",
    ratingBasis: "Published third-party score",
    body: "An imported rating for this property.",
    consent: true,
  });
  await publishReview(approver.id, importedId);
  const imported = await db.review.findUniqueOrThrow({ where: { id: importedId } });
  assert(imported.sourceType === "IMPORTED", "The imported source was replaced.");
  assert(imported.verificationStatus === "UNVERIFIED", "An import was marked verified.");
  await expectFailure(() => featureReview(approver.id, importedId, true), /imported/);
  await expectFailure(
    () => db.review.update({ where: { id: importedId }, data: { featured: true } }),
    /featured/,
  );
  const publicImported = await listTestimonials();
  assert(
    publicImported.every((item) => item.id !== importedId),
    "An imported rating appeared as a testimonial.",
  );

  await expectFailure(
    () =>
      createReview(editor.id, {
        resortId: "",
        sourceType: "FIRST_PARTY",
        sourceReference: "",
        displayName: "No evidence",
        rating: "",
        ratingBasis: "",
        body: "This should stay unpublished.",
        consent: true,
      }).then((id) => publishReview(approver.id, id)),
    /won enquiry|written permission/,
  );
  const permittedId = await createReview(editor.id, {
    resortId: "",
    sourceType: "FIRST_PARTY",
    sourceReference: "Written permission 2026-10-12",
    displayName: "Named guest",
    rating: "",
    ratingBasis: "",
    body: "Permission to publish this note is on file.",
    consent: true,
  });
  const permitted = await db.review.findUniqueOrThrow({ where: { id: permittedId } });
  assert(
    permitted.verificationStatus === "VERIFIED",
    "Written permission did not record evidence.",
  );
  await updateReview(editor.id, permittedId, {
    resortId: "",
    sourceType: "FIRST_PARTY",
    sourceReference: "Written permission 2026-10-12",
    displayName: "Named guest",
    rating: "",
    ratingBasis: "",
    body: "Permission to publish this note is on file.",
    consent: true,
  });
  const afterEdit = await db.review.findUniqueOrThrow({ where: { id: permittedId } });
  assert(afterEdit.verificationStatus === "VERIFIED", "Editing cleared the verification state.");
  assert(afterEdit.sourceType === "FIRST_PARTY", "Editing cleared the source.");
  assert(afterEdit.moderationStatus === "PENDING", "Editing a review left it published.");
  await publishReview(approver.id, permittedId);
  const publishedRow = await db.review.findUniqueOrThrow({ where: { id: permittedId } });
  assert(
    publishedRow.sourceType === "FIRST_PARTY" &&
      publishedRow.verificationStatus === "VERIFIED" &&
      publishedRow.moderationStatus === "APPROVED" &&
      publishedRow.publishedAt !== null,
    "The first-party note was not published with its source.",
  );
  assert(
    (await listTestimonials()).every((item) => item.id !== permittedId),
    "An unfeatured review appeared as a testimonial.",
  );
  await featureReview(approver.id, permittedId, true);
  const published = await listTestimonials();
  assert(
    published.some((item) => item.id === permittedId && item.label === "First-party review"),
    "The featured first-party note was not listed with its source.",
  );
  assert(
    published.every((item) => !item.label.includes("Verified")),
    "A public review used the word Verified.",
  );
  const resort = await db.resort.findFirst({
    where: { slug: "exercise-resort" },
    select: { id: true },
  });
  assert(resort, "The catalog exercise resort was not available.");
  const resortImportId = await createReview(editor.id, {
    resortId: resort.id,
    sourceType: "IMPORTED",
    sourceReference: "External extract",
    displayName: "External score",
    rating: "4.0",
    ratingBasis: "Published third-party score",
    body: "An imported rating attached to the exercise resort.",
    consent: true,
  });
  await publishReview(approver.id, resortImportId);
  const resortPublic = await listPublishedForResort(resort.id);
  assert(
    resortPublic.some((item) => item.id === resortImportId && item.label === "Imported rating"),
    "A published imported rating was missing from the resort list.",
  );
  assert(
    resortPublic.every((item) => item.label !== "First-party review"),
    "An imported rating was presented as a first-party review.",
  );

  const notice = await currentNoticeVersion();
  const subscribed = await subscribeNewsletter({
    email: "stage9-guest@example.com",
    consent: true,
    noticeVersion: notice,
    topics: ["guides"],
    source: "newsletter-form",
    ipHash: null,
    idempotencyKey: "stage9-subscribe-0001",
    actorId: null,
    website: "",
    replaceTopics: true,
  });
  assert(subscribed.status === "CONFIRMED", "A consented subscription was not confirmed.");
  const grant = await db.consentRecord.findFirstOrThrow({
    where: { subjectType: "SUBSCRIPTION", subjectId: subscribed.id, status: "GRANTED" },
  });
  assert(grant.purpose === "MARKETING", "Newsletter consent was not stored as marketing consent.");
  assert(
    grant.subjectType === "SUBSCRIPTION",
    "Newsletter consent was stored on a customer account.",
  );
  await expectFailure(
    () =>
      subscribeNewsletter({
        email: "stage9-guest@example.com",
        consent: false,
        noticeVersion: notice,
        topics: [],
        source: "newsletter-form",
        ipHash: null,
        idempotencyKey: "stage9-subscribe-0002",
        actorId: null,
        website: "",
        replaceTopics: false,
      }),
    /consent/,
  );
  await unsubscribeNewsletter(subscribed.id);
  const withdrawal = await db.consentRecord.findFirstOrThrow({
    where: { subjectId: subscribed.id, status: "WITHDRAWN", purpose: "MARKETING" },
  });
  const grantAfter = await db.consentRecord.findUniqueOrThrow({ where: { id: grant.id } });
  assert(grantAfter.status === "GRANTED", "Unsubscribe rewrote the original consent.");
  assert(grantAfter.withdrawnAt === null, "Unsubscribe changed the original consent time.");
  assert(withdrawal.id !== grant.id, "Unsubscribe did not add a withdrawal record.");
  const closed = await db.subscription.findUniqueOrThrow({ where: { id: subscribed.id } });
  assert(closed.status === "UNSUBSCRIBED", "Unsubscribe did not close the subscription.");

  await submitEnquiry(plan("stage9-guest@example.com", "stage9-enquiry-key-0001"), {
    userId: null,
    ipHash: null,
    idempotencyKey: "stage9-enquiry-key-0001",
  });
  const afterEnquiry = await db.subscription.findUniqueOrThrow({ where: { id: subscribed.id } });
  assert(afterEnquiry.status === "UNSUBSCRIBED", "An enquiry reactivated an unsubscribed address.");
  const withdrawalAfter = await db.consentRecord.findUniqueOrThrow({
    where: { id: withdrawal.id },
  });
  assert(withdrawalAfter.status === "WITHDRAWN", "An enquiry changed the withdrawal record.");

  const again = await subscribeNewsletter({
    email: "stage9-guest@example.com",
    consent: true,
    noticeVersion: notice,
    topics: ["planning"],
    source: "newsletter-form",
    ipHash: null,
    idempotencyKey: "stage9-subscribe-0003",
    actorId: null,
    website: "",
    replaceTopics: true,
  });
  assert(again.status === "CONFIRMED", "An explicit resubscribe did not confirm.");
  const withdrawalStill = await db.consentRecord.findUniqueOrThrow({
    where: { id: withdrawal.id },
  });
  assert(withdrawalStill.status === "WITHDRAWN", "Resubscribe changed the withdrawal record.");
  const grants = await db.consentRecord.count({
    where: { subjectId: subscribed.id, purpose: "MARKETING", status: "GRANTED" },
  });
  assert(grants >= 2, "Resubscribe did not store a new marketing consent.");

  await suppressSubscription(operations.id, subscribed.id);
  await expectFailure(
    () =>
      subscribeNewsletter({
        email: "stage9-guest@example.com",
        consent: true,
        noticeVersion: notice,
        topics: [],
        source: "newsletter-form",
        ipHash: null,
        idempotencyKey: "stage9-subscribe-0004",
        actorId: null,
        website: "",
        replaceTopics: false,
      }),
    /cannot be subscribed/,
  );

  await db.featureFlag.update({
    where: { key: "newsletterDoubleOptIn" },
    data: { enabled: true },
  });
  const pending = await subscribeNewsletter({
    email: "stage9-pending@example.com",
    consent: true,
    noticeVersion: notice,
    topics: [],
    source: "newsletter-form",
    ipHash: null,
    idempotencyKey: "stage9-subscribe-0005",
    actorId: null,
    website: "",
    replaceTopics: false,
  });
  assert(pending.status === "PENDING", "Double opt-in confirmed before the token was used.");
  const delivery = await db.emailDelivery.findFirstOrThrow({
    where: { relatedId: pending.id, templateCode: "newsletter.confirm" },
  });
  assert(delivery.status === "QUEUED", "The confirmation was marked sent.");
  const queuedJobs = await db.job.findMany({
    where: { type: "newsletter.confirm" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const job = queuedJobs.find((item) => {
    const payload = item.payload;
    return (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      "subscriptionId" in payload &&
      payload.subscriptionId === pending.id
    );
  });
  assert(job, "The confirmation job was not queued.");
  assert(!JSON.stringify(job.payload).includes("token"), "The confirmation job stored a token.");
  process.env.EMAIL_PROVIDER = "capture";
  let finished = job;
  for (let attempt = 0; attempt < 30 && finished.status !== "SUCCEEDED"; attempt += 1) {
    await runDueJobs(5);
    finished = await db.job.findUniqueOrThrow({ where: { id: job.id } });
  }
  delete process.env.EMAIL_PROVIDER;
  assert(finished.status === "SUCCEEDED", "The confirmation job did not succeed.");
  const sent = await db.emailDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
  assert(sent.status === "SENT" && Boolean(sent.providerId), "The provider id was not stored.");
  const { takeCapturedEmail } = await import("../src/lib/email/provider");
  const token = takeCapturedEmail().match(/token=([A-Za-z0-9_-]+)/)?.[1] ?? "";
  assert(token.length > 10, "The confirmation message had no token.");
  await confirmNewsletter(token);
  const confirmed = await db.subscription.findUniqueOrThrow({ where: { id: pending.id } });
  assert(confirmed.status === "CONFIRMED", "The token did not confirm the subscription.");
  await db.featureFlag.update({
    where: { key: "newsletterDoubleOptIn" },
    data: { enabled: false },
  });

  await expectFailure(
    () => importSubscriptions(operations.id, "stage9-import@example.com", false),
    /consent/,
  );
  const importedSubscribers = await importSubscriptions(
    operations.id,
    "stage9-import@example.com",
    true,
  );
  assert(importedSubscribers.imported === 1, "A consented import did not store a subscriber.");
  const importedConsent = await db.consentRecord.findFirst({
    where: { source: "staff-import", purpose: "MARKETING", status: "GRANTED" },
  });
  assert(importedConsent, "The import did not store marketing consent.");
  await expectFailure(() => listSubscriptions(consultant.id), /not available/);
  const visible = await listSubscriptions(operations.id);
  assert(
    visible.some((row) => row.email === "stage9-import@example.com"),
    "Operations could not read the list.",
  );
  const csv = await exportSubscriptions(operations.id);
  assert(csv.includes("stage9-import@example.com"), "The export omitted the imported address.");
  assert(!csv.includes("Desk note"), "The export included review text.");

  const before = await db.enquiry.count();
  await expectFailure(() => operationalReport(consultant.id), /not available/);
  const report = await operationalReport(operations.id);
  assert(report.responseFormula.includes("first response"), "The response formula was missing.");
  assert((await db.enquiry.count()) === before, "The report changed enquiry rows.");
  const analytics = await analyticsReport(operations.id);
  assert(typeof analytics.searchDemand === "number", "Search demand was not counted.");
  assert(!("queries" in analytics), "The analytics report exposed raw searches.");
  const denied = await recordProductEvent({
    name: "search_submitted",
    consent: "DENIED",
    anonymousKey: "11111111-1111-4111-8111-111111111111",
    properties: { query: "reef", resultCount: 1 },
  });
  assert(denied === false, "A denied search was stored.");
  const view = await recordProductEvent({
    name: "entity_viewed",
    consent: "DENIED",
    anonymousKey: "11111111-1111-4111-8111-111111111111",
    properties: { kind: "resort", path: "/resorts/example", email: "a@b.c" },
  });
  assert(view === true, "An identifier-free entity view was not stored.");
  const storedView = await db.analyticsEvent.findFirstOrThrow({
    where: { eventName: "entity_viewed", consentState: "DENIED" },
    orderBy: { occurredAt: "desc" },
  });
  assert(storedView.anonymousKey === null, "A denied view kept an anonymous key.");
  assert(
    !JSON.stringify(storedView.properties).includes("@"),
    "A denied view stored an email address.",
  );

  console.log("Stage 9 exercise passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
