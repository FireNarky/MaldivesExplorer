import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { assignRole } from "../src/modules/identity/service";
import { readOwnThread } from "../src/modules/customers/records";
import { submitEnquiry } from "../src/modules/enquiries/service";
import { emptyDraft, type PlannerDraft } from "../src/modules/enquiries/rules";
import { CrmError } from "../src/modules/crm/service";
import {
  addNote,
  assignEnquiry,
  attachMedia,
  changeStatus,
  exportEnquiries,
  listQueue,
  operationsReport,
  readEnquiry,
  saveQueueView,
} from "../src/modules/crm/service";
import { parseQueueFilters } from "../src/modules/crm/rules";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the CRM exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error("CRM exercise refused a database that is not disposable maldives_stage1.");
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
    if (error instanceof CrmError && pattern.test(message)) return;
    if (pattern.test(message)) return;
    throw error;
  }
  throw new Error(`Expected a rejection matching ${pattern.source}.`);
}

function plan(email: string, key: string): PlannerDraft {
  const draft = emptyDraft(key);
  draft.name = "CRM guest";
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

async function staff(email: string, name: string) {
  return db.user.create({ data: { email, name, status: "ACTIVE" } });
}

async function enquiryRow(reference: string) {
  return db.enquiry.findUniqueOrThrow({
    where: { reference },
    select: {
      id: true,
      revision: true,
      status: true,
      assignedUserId: true,
      firstResponseAt: true,
      terminalReasonCode: true,
      wonReference: true,
    },
  });
}

async function quoteReference(tx: Prisma.TransactionClient): Promise<string> {
  const [sequence] = await tx.$queryRaw<Array<{ n: bigint }>>`
    SELECT nextval('quote_reference_seq') AS n
  `;
  return `ME-Q-${String(sequence?.n ?? 0n).padStart(6, "0")}`;
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const exportSetting = await db.systemSetting.findUniqueOrThrow({
    where: { key: "export.maxRows" },
  });
  const robinSetting = await db.systemSetting.findUniqueOrThrow({
    where: { key: "roundRobinAssignment" },
  });
  try {
    const admin = await db.user.findUniqueOrThrow({
      where: { email: "migration-admin@example.com" },
    });
    const consultantA = await staff("crm-consultant-a@example.com", "Consultant A");
    const consultantB = await staff("crm-consultant-b@example.com", "Consultant B");
    const operations = await staff("crm-ops@example.com", "Operations");
    const auditor = await staff("crm-auditor@example.com", "Auditor");
    const editor = await staff("crm-editor@example.com", "Editor");
    const guestA = await db.user.create({
      data: { email: "crm-guest-a@example.com", name: "CRM guest A", status: "ACTIVE" },
    });
    const guestB = await db.user.create({
      data: { email: "crm-guest-b@example.com", name: "CRM guest B", status: "ACTIVE" },
    });
    await assignRole({ actorId: admin.id, userId: consultantA.id, role: "CONSULTANT" });
    await assignRole({ actorId: admin.id, userId: consultantB.id, role: "CONSULTANT" });
    await assignRole({ actorId: admin.id, userId: operations.id, role: "OPERATIONS_MANAGER" });
    await assignRole({ actorId: admin.id, userId: auditor.id, role: "AUDITOR" });
    await assignRole({ actorId: admin.id, userId: editor.id, role: "CONTENT_EDITOR" });

    const first = await submitEnquiry(plan("crm-guest-a@example.com", "crm-plan-a"), {
      userId: guestA.id,
      ipHash: "exercise",
      idempotencyKey: "crm-plan-a",
    });
    const second = await submitEnquiry(plan("crm-guest-b@example.com", "crm-plan-b"), {
      userId: guestB.id,
      ipHash: "exercise",
      idempotencyKey: "crm-plan-b",
    });
    const third = await submitEnquiry(plan("crm-guest-c@example.com", "crm-plan-c"), {
      userId: null,
      ipHash: "exercise",
      idempotencyKey: "crm-plan-c",
    });
    const fourth = await submitEnquiry(plan("crm-guest-d@example.com", "crm-plan-d"), {
      userId: null,
      ipHash: "exercise",
      idempotencyKey: "crm-plan-d",
    });
    await db.enquiry.update({
      where: { reference: third.reference },
      data: { createdAt: new Date("2026-10-05T04:00:00.000Z") },
    });

    const filters = parseQueueFilters({});
    await expectFailure(() => listQueue(editor.id, filters), /not available/);
    const before = await listQueue(consultantA.id, filters);
    assert(
      !before.rows.some((row) => row.reference === first.reference),
      "A consultant saw an unassigned enquiry.",
    );
    await expectFailure(() => readEnquiry(consultantA.id, first.reference), /not available/);

    let current = await enquiryRow(first.reference);
    await expectFailure(
      () =>
        assignEnquiry(
          operations.id,
          { reference: first.reference },
          { reason: "Round robin", revision: current.revision },
        ),
      /Choose a consultant/,
    );
    await assignEnquiry(
      operations.id,
      { reference: first.reference },
      {
        userId: consultantA.id,
        reason: "Primary consultant",
        revision: current.revision,
      },
    );
    current = await enquiryRow(first.reference);
    assert(current.assignedUserId === consultantA.id, "Assignment did not save the consultant.");
    const history = await db.enquiryAssignment.findMany({ where: { enquiryId: current.id } });
    assert(
      history.length === 1 && history[0]?.reason === "Primary consultant",
      "Assignment history is missing.",
    );
    await expectFailure(
      () =>
        assignEnquiry(
          consultantA.id,
          { reference: first.reference },
          {
            userId: consultantB.id,
            reason: "Swap",
            revision: current.revision,
          },
        ),
      /not available/,
    );

    const secondRow = await enquiryRow(second.reference);
    await assignEnquiry(
      operations.id,
      { reference: second.reference },
      {
        userId: consultantB.id,
        reason: "Second consultant",
        revision: secondRow.revision,
      },
    );
    await expectFailure(() => readEnquiry(consultantA.id, second.reference), /not available/);
    const visible = await readEnquiry(consultantB.id, second.reference);
    assert(
      visible.reference === second.reference,
      "The assigned consultant could not open the enquiry.",
    );
    await expectFailure(() => exportEnquiries(consultantB.id, filters), /not available/);
    await expectFailure(() => exportEnquiries(auditor.id, filters), /not available/);
    const audited = await readEnquiry(auditor.id, first.reference);
    assert(audited.canUpdate === false, "An auditor was offered an update.");
    await expectFailure(
      () =>
        changeStatus(
          auditor.id,
          { reference: first.reference },
          {
            status: "CLOSED",
            revision: current.revision,
            reasonCode: "DUPLICATE",
          },
        ),
      /not available/,
    );

    const privateBody = "CRM private planning note stays on the staff record.";
    await addNote(consultantA.id, first.reference, { body: privateBody, visibility: "INTERNAL" });
    current = await enquiryRow(first.reference);
    assert(current.firstResponseAt === null, "An internal note started the first-response timer.");
    await addNote(consultantA.id, first.reference, {
      body: "We received your plan.",
      visibility: "CUSTOMER",
    });
    current = await enquiryRow(first.reference);
    assert(current.firstResponseAt !== null, "A customer note did not record the first response.");
    const thread = await readOwnThread(guestA.id, first.reference);
    assert(thread !== null, "The customer could not open the thread.");
    assert(
      !thread.entries.some((entry) => entry.body === privateBody),
      "An internal note was visible to the customer.",
    );
    assert(
      thread.entries.some((entry) => entry.body === "We received your plan."),
      "The customer note was missing from the thread.",
    );
    assert(
      (await readOwnThread(guestB.id, first.reference)) === null,
      "Another customer opened the thread.",
    );

    await expectFailure(
      () =>
        changeStatus(
          consultantA.id,
          { reference: first.reference },
          {
            status: "CONTACTED",
            revision: current.revision - 1,
          },
        ),
      /updated/,
    );
    await changeStatus(
      consultantA.id,
      { reference: first.reference },
      {
        status: "CONTACTED",
        revision: current.revision,
      },
    );
    current = await enquiryRow(first.reference);
    await changeStatus(
      consultantA.id,
      { reference: first.reference },
      {
        status: "QUALIFIED",
        revision: current.revision,
        checklist: true,
      },
    );
    current = await enquiryRow(first.reference);
    await expectFailure(
      () =>
        changeStatus(
          consultantA.id,
          { reference: first.reference },
          {
            status: "QUOTED",
            revision: current.revision,
          },
        ),
      /sent quote/,
    );
    await changeStatus(
      consultantA.id,
      { reference: first.reference },
      {
        status: "NEGOTIATION",
        revision: current.revision,
        followUp: "2026-12-01T09:00",
      },
    );
    const negotiated = await readEnquiry(consultantA.id, first.reference);
    assert(
      negotiated.tasks.some((task) => task.title === "Follow up"),
      "Negotiation did not create a follow-up task.",
    );
    current = await enquiryRow(first.reference);
    await expectFailure(
      () =>
        changeStatus(
          consultantA.id,
          { reference: first.reference },
          {
            status: "WON",
            revision: current.revision,
            wonReference: "OP-1001",
          },
        ),
      /accepted quote/,
    );

    const resort = await db.resort.findUniqueOrThrow({
      where: { slug: "wishlist-exercise-resort" },
    });
    await db.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: { enquiryId: current.id, reference: await quoteReference(tx) },
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
          expiresAt: new Date("2027-01-01T00:00:00.000Z"),
          status: "DRAFT",
          createdById: operations.id,
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
      await tx.quoteVersion.update({ where: { id: version.id }, data: { status: "ACCEPTED" } });
    });
    await changeStatus(
      consultantA.id,
      { reference: first.reference },
      {
        status: "WON",
        revision: current.revision,
        wonReference: "OP-1001",
      },
    );
    current = await enquiryRow(first.reference);
    assert(
      current.status === "WON" && current.wonReference === "OP-1001",
      "Won did not store the reference.",
    );

    const lost = await enquiryRow(second.reference);
    await expectFailure(
      () =>
        changeStatus(
          consultantB.id,
          { reference: second.reference },
          {
            status: "LOST",
            revision: lost.revision,
          },
        ),
      /loss reason/,
    );
    await expectFailure(
      () =>
        changeStatus(
          consultantB.id,
          { reference: second.reference },
          {
            status: "LOST",
            revision: lost.revision,
            reasonCode: "FREE_TEXT",
          },
        ),
      /loss reason/,
    );
    await changeStatus(
      consultantB.id,
      { reference: second.reference },
      {
        status: "LOST",
        revision: lost.revision,
        reasonCode: "PRICE",
      },
    );
    const lostRow = await enquiryRow(second.reference);
    assert(lostRow.terminalReasonCode === "PRICE", "Lost did not store the reason code.");
    const lostHistory = await db.enquiryStatusHistory.findFirst({
      where: { enquiryId: lostRow.id, toStatus: "LOST" },
    });
    assert(lostHistory?.reasonCode === "PRICE", "Status history missed the loss reason.");
    await expectFailure(
      () =>
        changeStatus(
          consultantB.id,
          { reference: second.reference },
          {
            status: "CONTACTED",
            revision: lostRow.revision,
          },
        ),
      /assignment permission/,
    );
    await changeStatus(
      operations.id,
      { reference: second.reference },
      {
        status: "CONTACTED",
        revision: lostRow.revision,
      },
    );
    const reopened = await enquiryRow(second.reference);
    assert(
      reopened.status === "CONTACTED" && reopened.terminalReasonCode === null,
      "Reopen kept the loss reason.",
    );
    await changeStatus(
      operations.id,
      { reference: second.reference },
      {
        status: "CLOSED",
        revision: reopened.revision,
        reasonCode: "DUPLICATE",
      },
    );
    const closed = await enquiryRow(second.reference);
    assert(closed.terminalReasonCode === "DUPLICATE", "Closed did not store the closure reason.");

    const media = await db.mediaAsset.create({
      data: {
        storageKey: `exercise-crm-${randomBytes(4).toString("hex")}`,
        mimeType: "image/png",
        byteSize: 8,
        kind: "IMAGE",
        altText: "Exercise attachment",
        createdById: operations.id,
      },
    });
    await attachMedia(consultantA.id, first.reference, media.id);
    const attached = await readEnquiry(consultantA.id, first.reference);
    assert(
      attached.attachments.some((item) => item.label === "Exercise attachment"),
      "The media file was not attached.",
    );

    await saveQueueView(operations.id, {
      name: "New plans",
      q: "",
      status: "NEW",
      assignment: "unassigned",
    });
    const operationsQueue = await listQueue(operations.id, filters);
    const consultantQueue = await listQueue(consultantA.id, filters);
    assert(
      operationsQueue.views.some((view) => view.name === "New plans"),
      "The saved view was not stored.",
    );
    assert(
      !consultantQueue.views.some((view) => view.name === "New plans"),
      "Another staff member received the saved view.",
    );
    assert(
      consultantQueue.rows.some((row) => row.reference === first.reference),
      "The consultant lost the assigned enquiry.",
    );
    assert(
      !consultantQueue.rows.some(
        (row) => row.reference === second.reference || row.reference === third.reference,
      ),
      "The consultant saw another enquiry.",
    );

    const file = await exportEnquiries(operations.id, filters);
    assert(file.csv.includes(first.reference), "The export missed an enquiry.");
    assert(!file.csv.includes(privateBody), "The export included an internal note.");
    assert(!file.csv.split("\n")[0]?.includes("age"), "The export included traveler ages.");
    const exportAudit = await db.auditLog.findFirst({
      where: { actorId: operations.id, action: "enquiry.export" },
    });
    assert(exportAudit !== null, "The export was not audited.");

    await db.systemSetting.update({ where: { key: "export.maxRows" }, data: { value: 1 } });
    const capped = await exportEnquiries(operations.id, filters);
    assert(capped.capped && capped.rows === 1, "The export cap was not applied.");

    const report = await operationsReport(operations.id);
    assert(report.waitingPast >= 1, "A backdated enquiry was inside the target.");
    assert(report.unassigned >= 1, "The unassigned count missed an open enquiry.");
    assert((report.oldestOpenMinutes ?? 0) > 120, "Aging did not pass the internal target.");
    await expectFailure(() => operationsReport(consultantA.id), /not available/);

    await db.systemSetting.update({
      where: { key: "roundRobinAssignment" },
      data: { value: true },
    });
    const robin = await enquiryRow(fourth.reference);
    await assignEnquiry(
      operations.id,
      { reference: fourth.reference },
      {
        reason: "Round robin among active consultants.",
        revision: robin.revision,
      },
    );
    const assigned = await enquiryRow(fourth.reference);
    assert(assigned.assignedUserId !== null, "Round robin did not choose a consultant.");
    const chosen = await db.user.findUniqueOrThrow({
      where: { id: assigned.assignedUserId },
      select: { status: true, roles: { select: { role: { select: { code: true } } } } },
    });
    assert(
      chosen.status === "ACTIVE" && chosen.roles.some((role) => role.role.code === "CONSULTANT"),
      "Round robin chose someone other than an active consultant.",
    );
    const robinHistory = await db.enquiryAssignment.findFirst({
      where: { enquiryId: assigned.id, reason: "Round robin among active consultants." },
    });
    assert(robinHistory !== null, "Round robin did not record a reason.");
    console.log("CRM exercise passed.");
  } finally {
    await db.systemSetting.update({
      where: { key: "export.maxRows" },
      data: { value: exportSetting.value as Prisma.InputJsonValue },
    });
    await db.systemSetting.update({
      where: { key: "roundRobinAssignment" },
      data: { value: robinSetting.value as Prisma.InputJsonValue },
    });
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "CRM exercise failed.");
    await db.$disconnect();
    process.exit(1);
  });
