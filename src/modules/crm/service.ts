import type { EnquiryStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isRoleCode, permissionsForRole, type PermissionCode } from "@/lib/auth/permissions";
import { writeAudit } from "@/modules/audit/service";
import { permissionsForUser, isStaffUser } from "@/modules/identity/service";
import { partySupplied } from "@/modules/enquiries/party";
import { openEnquiryStatuses } from "@/modules/enquiries/rules";
import {
  canAssignEnquiries,
  canAttachEnquiryMedia,
  canExportEnquiries,
  canReadEnquiry,
  canReadOperationsReport,
  canUpdateEnquiry,
  seesAllEnquiries,
} from "@/modules/crm/policies";
import {
  booleanSetting,
  businessMinutesBetween,
  clip,
  exportRowCap,
  formatStaffDate,
  isCommunicationChannel,
  isEnquiryStatus,
  isOpenEnquiryStatus,
  isTaskStatus,
  nextStatuses,
  parseBusinessHours,
  parseQueueViews,
  parseStaffInstant,
  pickLeastLoaded,
  positiveInt,
  queueViewNameError,
  readSla,
  requiredText,
  slaLabel,
  statusLabel,
  toCsv,
  transitionBlock,
  upsertQueueView,
  type AssignmentFilter,
  type BusinessHours,
  type EnquiryStatusName,
  type ExportRow,
  type QueueFilters,
  type QueueView,
  type SlaReading,
} from "@/modules/crm/rules";

export const moduleStatus = "implemented" as const;

const unavailable = "That record is not available.";
const forbidden = "That action is not available.";
const conflict = "This enquiry was updated. Reload it.";
const viewKeyPrefix = "crm.queueViews.";

export class CrmError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CrmError";
    this.status = status;
  }
}

type Actor = { userId: string; permissions: PermissionCode[] };

type EnquiryKey = { id: string } | { reference: string };

type StatusChange = {
  status: string;
  revision: number;
  reasonCode?: string;
  wonReference?: string;
  followUp?: string;
  checklist?: boolean;
  channel?: string;
};

type AssignmentChange = {
  userId?: string;
  reason: string;
  revision: number;
};

export type QueueRow = {
  id: string;
  reference: string;
  statusLabel: string;
  customerName: string;
  assigneeName: string | null;
  slaLabel: string;
};

export type QueuePage = {
  rows: QueueRow[];
  total: number;
  page: number;
  pageSize: number;
  canExport: boolean;
  canAssign: boolean;
  canReport: boolean;
  seesAll: boolean;
  views: QueueView[];
  targetMinutes: number | null;
  exportCap: number;
};

export type EnquiryDetail = {
  id: string;
  reference: string;
  revision: number;
  status: EnquiryStatusName;
  statusLabel: string;
  nextStatuses: EnquiryStatusName[];
  customerName: string;
  customerEmail: string;
  assigneeName: string | null;
  createdLabel: string;
  travel: string;
  flexibility: string | null;
  adultCount: number;
  /** False when adultCount is a system placeholder, not a customer-provided party size. */
  partySupplied: boolean;
  childCount: number;
  travelers: string[];
  requirements: string | null;
  accessibilityNeeds: string | null;
  budget: string | null;
  slaLabel: string;
  targetMinutes: number | null;
  firstResponseLabel: string | null;
  terminalReasonCode: string | null;
  wonReference: string | null;
  canUpdate: boolean;
  canAssign: boolean;
  canAttach: boolean;
  lossReasons: Array<{ code: string; label: string }>;
  closureReasons: Array<{ code: string; label: string }>;
  assignees: Array<{ id: string; name: string; email: string }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueLabel: string | null;
    assigneeName: string;
  }>;
  notes: Array<{
    id: string;
    visibility: "INTERNAL" | "CUSTOMER";
    body: string;
    authorName: string;
    createdLabel: string;
  }>;
  communications: Array<{
    id: string;
    channel: string;
    direction: string;
    summary: string;
    subject: string | null;
    occurredLabel: string;
  }>;
  attachments: Array<{ id: string; label: string }>;
  statusHistory: Array<{
    id: string;
    label: string;
    reasonCode: string | null;
    changedLabel: string;
  }>;
  assignments: Array<{ id: string; label: string; reason: string; assignedLabel: string }>;
};

export type OperationsReport = {
  targetMinutes: number | null;
  counts: Array<{ status: string; label: string; count: number }>;
  unassigned: number;
  waiting: number;
  waitingPast: number;
  answeredInside: number;
  answeredPast: number;
  oldestOpenMinutes: number | null;
};

export type EnquiryExport = { csv: string; rows: number; capped: boolean; cap: number };

const enquirySelect = {
  id: true,
  reference: true,
  status: true,
  revision: true,
  assignedUserId: true,
  createdAt: true,
  firstResponseAt: true,
  travelStart: true,
  travelEnd: true,
  flexibility: true,
  adultCount: true,
  childCount: true,
  submittedSnapshot: true,
  budgetMin: true,
  budgetMax: true,
  budgetCurrency: true,
  requirements: true,
  accessibilityNeeds: true,
  terminalReasonCode: true,
  wonReference: true,
  customer: { select: { name: true, email: true } },
  assignedUser: { select: { name: true, email: true } },
} satisfies Prisma.EnquirySelect;

function asStatus(status: EnquiryStatusName): EnquiryStatus {
  return status;
}

async function actor(userId: string): Promise<Actor> {
  if (!userId) throw new CrmError("Sign in to continue.", 401);
  if (!(await isStaffUser(userId))) throw new CrmError(forbidden, 403);
  return { userId, permissions: await permissionsForUser(userId) };
}

function assertKey(key: EnquiryKey): void {
  if (
    "id" in key &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key.id)
  ) {
    throw new CrmError(unavailable, 404);
  }
  if ("reference" in key && !/^ME-E-\d{6}$/.test(key.reference))
    throw new CrmError(unavailable, 404);
}

function whereKey(key: EnquiryKey): Prisma.EnquiryWhereUniqueInput {
  return "id" in key ? { id: key.id } : { reference: key.reference };
}

function scopedFilters(current: Actor, filters: QueueFilters): QueueFilters {
  if (seesAllEnquiries(current.permissions)) return filters;
  return { ...filters, assignment: "mine" };
}

function queueWhere(current: Actor, filters: QueueFilters): Prisma.EnquiryWhereInput {
  const where: Prisma.EnquiryWhereInput = {};
  if (!seesAllEnquiries(current.permissions)) where.assignedUserId = current.userId;
  else if (filters.assignment === "mine") where.assignedUserId = current.userId;
  else if (filters.assignment === "unassigned") where.assignedUserId = null;
  if (filters.status && isEnquiryStatus(filters.status)) where.status = asStatus(filters.status);
  if (filters.q) {
    where.OR = [
      { reference: { contains: filters.q, mode: "insensitive" } },
      { customer: { name: { contains: filters.q, mode: "insensitive" } } },
      { customer: { email: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function readSetting(key: string): Promise<unknown> {
  const row = await db.systemSetting.findUnique({ where: { key }, select: { value: true } });
  return row?.value ?? null;
}

async function slaTarget(): Promise<{ target: number | null; hours: BusinessHours | null }> {
  const policy = await db.slaPolicy.findFirst({
    where: { active: true },
    select: { firstResponseMinutes: true, businessHours: true },
  });
  return {
    target: policy?.firstResponseMinutes ?? null,
    hours: parseBusinessHours(policy?.businessHours ?? null),
  };
}

function readingFor(
  row: { createdAt: Date; firstResponseAt: Date | null },
  target: { target: number | null; hours: BusinessHours | null },
  now: Date,
): SlaReading {
  return readSla({
    createdAt: row.createdAt,
    firstResponseAt: row.firstResponseAt,
    now,
    targetMinutes: target.target,
    hours: target.hours,
  });
}

async function requireReadable(current: Actor, key: EnquiryKey) {
  assertKey(key);
  const enquiry = await db.enquiry.findUnique({ where: whereKey(key), select: enquirySelect });
  if (!enquiry || !canReadEnquiry(current.permissions, current.userId, enquiry.assignedUserId)) {
    throw new CrmError(unavailable, 404);
  }
  return enquiry;
}

async function eligibleAssignees(): Promise<Array<{ id: string; name: string; email: string }>> {
  const users = await db.user.findMany({
    where: { status: "ACTIVE", roles: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      roles: { select: { role: { select: { code: true } } } },
    },
    orderBy: { name: "asc" },
  });
  return users
    .filter((user) =>
      user.roles.some(
        (row) =>
          isRoleCode(row.role.code) && permissionsForRole(row.role.code).includes("enquiry.update"),
      ),
    )
    .map((user) => ({ id: user.id, name: user.name, email: user.email }));
}

async function quoteFlags(
  enquiryId: string,
): Promise<{ hasSentQuote: boolean; hasAcceptedQuote: boolean }> {
  const [sent, accepted] = await Promise.all([
    db.quoteVersion.findFirst({
      where: {
        sentAt: { not: null },
        status: { in: ["SENT", "ACCEPTED", "DECLINED", "EXPIRED", "SUPERSEDED", "WITHDRAWN"] },
        quote: { enquiryId },
      },
      select: { id: true },
    }),
    db.quoteVersion.findFirst({
      where: { sentAt: { not: null }, status: "ACCEPTED", quote: { enquiryId } },
      select: { id: true },
    }),
  ]);
  return { hasSentQuote: Boolean(sent), hasAcceptedQuote: Boolean(accepted) };
}

function viewStorageKey(userId: string): string {
  return `${viewKeyPrefix}${userId}`;
}

async function ownViews(userId: string): Promise<QueueView[]> {
  return parseQueueViews(await readSetting(viewStorageKey(userId)));
}

function travelerLabel(type: string, age: number | null): string {
  const name = type === "CHILD" ? "Child" : type === "INFANT" ? "Infant" : "Adult";
  return age === null ? name : `${name}, age ${age}`;
}

function budgetLabel(
  min: { toString(): string } | null,
  max: { toString(): string } | null,
  currency: string | null,
): string | null {
  const low = min?.toString() ?? "";
  const high = max?.toString() ?? "";
  if (!low && !high) return null;
  const span = low && high ? `${low}–${high}` : low || high;
  return currency ? `${span} ${currency.trim()}` : span;
}

function dateLabel(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export async function listQueue(userId: string, filters: QueueFilters): Promise<QueuePage> {
  const current = await actor(userId);
  if (
    !seesAllEnquiries(current.permissions) &&
    !current.permissions.includes("enquiry.read.assigned")
  ) {
    throw new CrmError(forbidden, 403);
  }
  const scoped = scopedFilters(current, filters);
  const where = queueWhere(current, scoped);
  const [pageSize, target, cap, views, total] = await Promise.all([
    readSetting("admin.pageSize").then((value) => positiveInt(value, 50, 100)),
    slaTarget(),
    readSetting("export.maxRows").then((value) => exportRowCap(value)),
    ownViews(current.userId),
    db.enquiry.count({ where }),
  ]);
  const rows = await db.enquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (scoped.page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      reference: true,
      status: true,
      createdAt: true,
      firstResponseAt: true,
      customer: { select: { name: true } },
      assignedUser: { select: { name: true } },
    },
  });
  const now = new Date();
  return {
    rows: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      statusLabel: statusLabel(row.status),
      customerName: row.customer.name,
      assigneeName: row.assignedUser?.name ?? null,
      slaLabel: slaLabel(readingFor(row, target, now)),
    })),
    total,
    page: scoped.page,
    pageSize,
    canExport: canExportEnquiries(current.permissions),
    canAssign: canAssignEnquiries(current.permissions),
    canReport: canReadOperationsReport(current.permissions),
    seesAll: seesAllEnquiries(current.permissions),
    views,
    targetMinutes: target.target,
    exportCap: cap,
  };
}

export async function readEnquiry(userId: string, reference: string): Promise<EnquiryDetail> {
  const current = await actor(userId);
  const enquiry = await requireReadable(current, { reference });
  const [
    target,
    reasons,
    assignees,
    tasks,
    notes,
    communications,
    attachments,
    statusHistory,
    assignments,
    travelers,
  ] = await Promise.all([
    slaTarget(),
    db.vocabularyItem.findMany({
      where: { set: { in: ["LOSS_REASON", "CLOSURE_REASON"] }, active: true },
      select: { set: true, code: true, label: true },
      orderBy: { sortOrder: "asc" },
    }),
    eligibleAssignees(),
    db.task.findMany({
      where: { enquiryId: enquiry.id },
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        assignee: { select: { name: true } },
      },
    }),
    db.note.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        visibility: true,
        body: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
    db.communicationLog.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        channel: true,
        direction: true,
        summary: true,
        subject: true,
        occurredAt: true,
      },
    }),
    db.attachment.findMany({
      where: { ownerType: "ENQUIRY", ownerId: enquiry.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, media: { select: { altText: true, mimeType: true } } },
    }),
    db.enquiryStatusHistory.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { changedAt: "asc" },
      select: { id: true, fromStatus: true, toStatus: true, reasonCode: true, changedAt: true },
    }),
    db.enquiryAssignment.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { assignedAt: "asc" },
      select: {
        id: true,
        reason: true,
        assignedAt: true,
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
      },
    }),
    db.enquiryTraveler.findMany({
      where: { enquiryId: enquiry.id },
      orderBy: { sortOrder: "asc" },
      select: { travelerType: true, ageAtArrival: true },
    }),
  ]);
  const status = enquiry.status;
  if (!isEnquiryStatus(status)) throw new CrmError(unavailable, 404);
  const canAssign = canAssignEnquiries(current.permissions);
  const allowed = nextStatuses[status].filter((next) => {
    if ((status === "LOST" || status === "CLOSED") && next === "CONTACTED") return canAssign;
    return true;
  });
  const supplied = partySupplied(enquiry.submittedSnapshot);
  const start = dateLabel(enquiry.travelStart);
  const end = dateLabel(enquiry.travelEnd);
  return {
    id: enquiry.id,
    reference: enquiry.reference,
    revision: enquiry.revision,
    status,
    statusLabel: statusLabel(status),
    nextStatuses: allowed,
    customerName: enquiry.customer.name,
    customerEmail: enquiry.customer.email,
    assigneeName: enquiry.assignedUser?.name ?? null,
    createdLabel: formatStaffDate(enquiry.createdAt),
    travel: start && end ? `${start} to ${end}` : "Not added",
    flexibility: enquiry.flexibility,
    adultCount: enquiry.adultCount,
    partySupplied: supplied,
    childCount: enquiry.childCount,
    travelers: supplied
      ? travelers.map((traveler) => travelerLabel(traveler.travelerType, traveler.ageAtArrival))
      : [],
    requirements: enquiry.requirements,
    accessibilityNeeds: enquiry.accessibilityNeeds,
    budget: budgetLabel(enquiry.budgetMin, enquiry.budgetMax, enquiry.budgetCurrency),
    slaLabel: slaLabel(readingFor(enquiry, target, new Date())),
    targetMinutes: target.target,
    firstResponseLabel: enquiry.firstResponseAt ? formatStaffDate(enquiry.firstResponseAt) : null,
    terminalReasonCode: enquiry.terminalReasonCode,
    wonReference: enquiry.wonReference,
    canUpdate: canUpdateEnquiry(current.permissions, current.userId, enquiry.assignedUserId),
    canAssign,
    canAttach:
      canAttachEnquiryMedia(current.permissions) &&
      canUpdateEnquiry(current.permissions, current.userId, enquiry.assignedUserId),
    lossReasons: reasons
      .filter((item) => item.set === "LOSS_REASON")
      .map((item) => ({ code: item.code, label: item.label })),
    closureReasons: reasons
      .filter((item) => item.set === "CLOSURE_REASON")
      .map((item) => ({ code: item.code, label: item.label })),
    assignees,
    tasks: tasks
      .sort(
        (left, right) =>
          (left.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (right.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
      )
      .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueLabel: task.dueAt ? formatStaffDate(task.dueAt) : null,
        assigneeName: task.assignee.name,
      })),
    notes: notes.map((note) => ({
      id: note.id,
      visibility: note.visibility,
      body: note.body,
      authorName: note.author.name,
      createdLabel: formatStaffDate(note.createdAt),
    })),
    communications: communications.map((entry) => ({
      id: entry.id,
      channel: entry.channel,
      direction: entry.direction,
      summary: entry.summary,
      subject: entry.subject,
      occurredLabel: formatStaffDate(entry.occurredAt),
    })),
    attachments: attachments.map((item) => ({
      id: item.id,
      label: item.media.altText || item.media.mimeType,
    })),
    statusHistory: statusHistory.map((item) => ({
      id: item.id,
      label: item.fromStatus
        ? `${statusLabel(item.fromStatus)} to ${statusLabel(item.toStatus)}`
        : statusLabel(item.toStatus),
      reasonCode: item.reasonCode,
      changedLabel: formatStaffDate(item.changedAt),
    })),
    assignments: assignments.map((item) => ({
      id: item.id,
      label: item.fromUser
        ? `${item.fromUser.name} to ${item.toUser.name}`
        : `Assigned to ${item.toUser.name}`,
      reason: item.reason,
      assignedLabel: formatStaffDate(item.assignedAt),
    })),
  };
}

export async function assignEnquiry(
  userId: string,
  key: EnquiryKey,
  input: AssignmentChange,
): Promise<void> {
  const current = await actor(userId);
  if (!canAssignEnquiries(current.permissions)) throw new CrmError(forbidden, 403);
  const reasonError = requiredText(
    input.reason,
    "Enter a reason.",
    500,
    "Enter a reason of 500 characters or fewer.",
  );
  if (reasonError) throw new CrmError(reasonError, 400);
  const existing = await requireReadable(current, key);
  const explicit = input.userId?.trim() || "";
  if (explicit) {
    const choices = await eligibleAssignees();
    if (!choices.some((choice) => choice.id === explicit))
      throw new CrmError("Choose an active consultant.", 400);
  } else if (!booleanSetting(await readSetting("roundRobinAssignment"))) {
    throw new CrmError("Choose a consultant.", 400);
  }
  await db.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.findUnique({
      where: { id: existing.id },
      select: { id: true, revision: true, assignedUserId: true },
    });
    if (!enquiry || enquiry.revision !== input.revision) throw new CrmError(conflict, 409);
    let assigneeId = explicit;
    if (!assigneeId) {
      const consultants = await tx.user.findMany({
        where: { status: "ACTIVE", roles: { some: { role: { code: "CONSULTANT" } } } },
        select: {
          id: true,
          _count: {
            select: {
              assignedEnquiries: { where: { status: { in: [...openEnquiryStatuses] } } },
            },
          },
        },
      });
      const picked = pickLeastLoaded(
        consultants.map((consultant) => ({
          id: consultant.id,
          openCount: consultant._count.assignedEnquiries,
        })),
      );
      if (!picked) throw new CrmError("No consultant is available for round robin.", 400);
      assigneeId = picked;
    }
    const updated = await tx.enquiry.updateMany({
      where: { id: enquiry.id, revision: input.revision },
      data: { assignedUserId: assigneeId, revision: { increment: 1 } },
    });
    if (updated.count !== 1) throw new CrmError(conflict, 409);
    const assignment = await tx.enquiryAssignment.create({
      data: {
        enquiryId: enquiry.id,
        fromUserId: enquiry.assignedUserId,
        toUserId: assigneeId,
        reason: input.reason.trim(),
        assignedById: current.userId,
      },
      select: { id: true },
    });
    await writeAudit(
      {
        actorId: current.userId,
        action: "enquiry.assign",
        entityType: "Enquiry",
        entityId: enquiry.id,
        before: { assignedUserId: enquiry.assignedUserId },
        after: { assignedUserId: assigneeId, assignmentId: assignment.id },
      },
      tx,
    );
  });
}

export async function changeStatus(
  userId: string,
  key: EnquiryKey,
  input: StatusChange,
): Promise<void> {
  const current = await actor(userId);
  const existing = await requireReadable(current, key);
  if (!canUpdateEnquiry(current.permissions, current.userId, existing.assignedUserId)) {
    throw new CrmError(forbidden, 403);
  }
  if (!isEnquiryStatus(existing.status) || !isEnquiryStatus(input.status)) {
    throw new CrmError("That status change is not available.", 400);
  }
  const nextStatus = input.status;
  const followUp = input.followUp?.trim() ? parseStaffInstant(input.followUp) : null;
  if (input.status === "NEGOTIATION" && input.followUp?.trim() && !followUp) {
    throw new CrmError("Enter a follow-up date.", 400);
  }
  const flags = await quoteFlags(existing.id);
  const block = transitionBlock({
    from: existing.status,
    to: input.status,
    canAssign: canAssignEnquiries(current.permissions),
    reasonCode: input.reasonCode ?? "",
    wonReference: input.wonReference ?? "",
    followUp:
      input.status === "NEGOTIATION" && followUp ? (input.followUp ?? "") : (input.followUp ?? ""),
    checklist: input.checklist === true,
    channel: input.channel ?? "",
    hasSentQuote: flags.hasSentQuote,
    hasAcceptedQuote: flags.hasAcceptedQuote,
  });
  if (block) throw new CrmError(block, 400);
  const reasonCode = clip(input.reasonCode ?? "", 40);
  if (input.status === "LOST" || input.status === "CLOSED") {
    const set = input.status === "LOST" ? "LOSS_REASON" : "CLOSURE_REASON";
    const reason = await db.vocabularyItem.findFirst({
      where: { set, code: reasonCode, active: true },
      select: { id: true },
    });
    if (!reason) {
      throw new CrmError(
        input.status === "LOST" ? "Choose a loss reason." : "Choose a closure reason.",
        400,
      );
    }
  }
  if (input.status === "WON" && (input.wonReference ?? "").trim().length > 80) {
    throw new CrmError("Enter an operational reference of 80 characters or fewer.", 400);
  }
  const wonReference = clip(input.wonReference ?? "", 80);
  if (input.status === "WON" && !wonReference) {
    throw new CrmError("An accepted quote and an operational reference are required.", 400);
  }
  const channel = input.channel ?? "";
  const note =
    input.status === "QUALIFIED"
      ? "Qualification checklist confirmed."
      : input.status === "CONTACT_ATTEMPTED"
        ? `Channel: ${channel}`
        : input.status === "NEGOTIATION"
          ? "Follow-up scheduled."
          : (existing.status === "LOST" || existing.status === "CLOSED") &&
              input.status === "CONTACTED"
            ? "Reopened."
            : null;
  await db.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.findUnique({
      where: { id: existing.id },
      select: {
        id: true,
        status: true,
        revision: true,
        assignedUserId: true,
        firstResponseAt: true,
      },
    });
    if (!enquiry || enquiry.revision !== input.revision || !isEnquiryStatus(enquiry.status)) {
      throw new CrmError(conflict, 409);
    }
    const previousStatus = enquiry.status;
    const updated = await tx.enquiry.updateMany({
      where: { id: enquiry.id, revision: input.revision },
      data: {
        status: asStatus(nextStatus),
        revision: { increment: 1 },
        terminalReasonCode:
          input.status === "LOST" || input.status === "CLOSED" ? reasonCode : null,
        ...(input.status === "WON" ? { wonReference } : {}),
        ...(enquiry.firstResponseAt || input.status === "LOST" || input.status === "CLOSED"
          ? {}
          : { firstResponseAt: new Date() }),
      },
    });
    if (updated.count !== 1) throw new CrmError(conflict, 409);
    await tx.enquiryStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        fromStatus: asStatus(previousStatus),
        toStatus: asStatus(nextStatus),
        reasonCode: input.status === "LOST" || input.status === "CLOSED" ? reasonCode : null,
        note,
        changedById: current.userId,
      },
    });
    if (input.status === "CONTACT_ATTEMPTED" && isCommunicationChannel(channel)) {
      await tx.communicationLog.create({
        data: {
          enquiryId: enquiry.id,
          channel,
          direction: "OUTBOUND",
          summary: "Contact attempted.",
          occurredAt: new Date(),
          loggedById: current.userId,
        },
      });
    }
    if (input.status === "NEGOTIATION" && followUp) {
      await tx.task.create({
        data: {
          enquiryId: enquiry.id,
          assigneeId: enquiry.assignedUserId ?? current.userId,
          title: "Follow up",
          dueAt: followUp,
          status: "OPEN",
        },
      });
    }
    await writeAudit(
      {
        actorId: current.userId,
        action: "enquiry.status",
        entityType: "Enquiry",
        entityId: enquiry.id,
        before: { status: enquiry.status },
        after: { status: input.status, reasonCode: reasonCode || null },
      },
      tx,
    );
  });
}

export async function addTask(
  userId: string,
  reference: string,
  input: { title: string; dueAt?: string },
): Promise<void> {
  const current = await actor(userId);
  const enquiry = await requireReadable(current, { reference });
  if (!canUpdateEnquiry(current.permissions, current.userId, enquiry.assignedUserId)) {
    throw new CrmError(forbidden, 403);
  }
  const titleError = requiredText(
    input.title,
    "Enter a task title.",
    160,
    "Enter a task title of 160 characters or fewer.",
  );
  if (titleError) throw new CrmError(titleError, 400);
  const dueAt = input.dueAt?.trim() ? parseStaffInstant(input.dueAt) : null;
  if (input.dueAt?.trim() && !dueAt) throw new CrmError("Enter a follow-up date.", 400);
  const task = await db.task.create({
    data: {
      enquiryId: enquiry.id,
      assigneeId: enquiry.assignedUserId ?? current.userId,
      title: input.title.trim(),
      dueAt,
      status: "OPEN",
    },
    select: { id: true },
  });
  await writeAudit({
    actorId: current.userId,
    action: "enquiry.task",
    entityType: "Task",
    entityId: task.id,
    after: { enquiryId: enquiry.id, status: "OPEN" },
  });
}

export async function updateTask(
  userId: string,
  reference: string,
  taskId: string,
  status: string,
): Promise<void> {
  const current = await actor(userId);
  const enquiry = await requireReadable(current, { reference });
  if (!canUpdateEnquiry(current.permissions, current.userId, enquiry.assignedUserId)) {
    throw new CrmError(forbidden, 403);
  }
  if (!isTaskStatus(status)) throw new CrmError("Choose a task status.", 400);
  const task = await db.task.findFirst({
    where: { id: taskId, enquiryId: enquiry.id },
    select: { id: true, status: true },
  });
  if (!task) throw new CrmError(unavailable, 404);
  await db.task.update({
    where: { id: task.id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  await writeAudit({
    actorId: current.userId,
    action: "enquiry.task",
    entityType: "Task",
    entityId: task.id,
    before: { status: task.status },
    after: { enquiryId: enquiry.id, status },
  });
}

export async function addNote(
  userId: string,
  reference: string,
  input: { body: string; visibility?: string },
): Promise<void> {
  const current = await actor(userId);
  const enquiry = await requireReadable(current, { reference });
  if (!canUpdateEnquiry(current.permissions, current.userId, enquiry.assignedUserId)) {
    throw new CrmError(forbidden, 403);
  }
  const visibility =
    input.visibility === "CUSTOMER"
      ? "CUSTOMER"
      : input.visibility === "INTERNAL" || !input.visibility
        ? "INTERNAL"
        : "";
  if (!visibility) throw new CrmError("Choose a note visibility.", 400);
  const bodyError = requiredText(
    input.body,
    "Enter a note.",
    4000,
    "Enter a note of 4000 characters or fewer.",
  );
  if (bodyError) throw new CrmError(bodyError, 400);
  await db.$transaction(async (tx) => {
    const created = await tx.note.create({
      data: {
        enquiryId: enquiry.id,
        authorId: current.userId,
        visibility,
        body: input.body.trim(),
      },
      select: { id: true },
    });
    if (visibility === "CUSTOMER" && !enquiry.firstResponseAt) {
      const updated = await tx.enquiry.updateMany({
        where: { id: enquiry.id, revision: enquiry.revision },
        data: { firstResponseAt: new Date(), revision: { increment: 1 } },
      });
      if (updated.count !== 1) throw new CrmError(conflict, 409);
    }
    await writeAudit(
      {
        actorId: current.userId,
        action: "enquiry.note",
        entityType: "Note",
        entityId: created.id,
        after: { enquiryId: enquiry.id, visibility },
      },
      tx,
    );
  });
}

export async function addCommunication(
  userId: string,
  reference: string,
  input: {
    channel: string;
    direction: string;
    summary: string;
    subject?: string;
    occurredAt?: string;
  },
): Promise<void> {
  const current = await actor(userId);
  const enquiry = await requireReadable(current, { reference });
  if (!canUpdateEnquiry(current.permissions, current.userId, enquiry.assignedUserId)) {
    throw new CrmError(forbidden, 403);
  }
  if (!isCommunicationChannel(input.channel)) throw new CrmError("Choose a channel.", 400);
  if (input.direction !== "INBOUND" && input.direction !== "OUTBOUND") {
    throw new CrmError("Choose a direction.", 400);
  }
  const channelName = input.channel;
  const directionName = input.direction;
  const summaryError = requiredText(
    input.summary,
    "Enter a summary.",
    4000,
    "Enter a summary of 4000 characters or fewer.",
  );
  if (summaryError) throw new CrmError(summaryError, 400);
  const subject = clip(input.subject ?? "", 200);
  if ((input.subject ?? "").trim().length > 200)
    throw new CrmError("Enter a subject of 200 characters or fewer.", 400);
  const occurredAt = input.occurredAt?.trim() ? parseStaffInstant(input.occurredAt) : new Date();
  if (!occurredAt) throw new CrmError("Enter a time.", 400);
  if (occurredAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new CrmError("Enter a time that has already happened.", 400);
  }
  await db.$transaction(async (tx) => {
    const row = await tx.enquiry.findUnique({
      where: { id: enquiry.id },
      select: { id: true, revision: true, firstResponseAt: true, createdAt: true },
    });
    if (!row) throw new CrmError(unavailable, 404);
    if (occurredAt.getTime() < row.createdAt.getTime()) {
      throw new CrmError("Enter a time at or after the enquiry was received.", 400);
    }
    const entry = await tx.communicationLog.create({
      data: {
        enquiryId: row.id,
        channel: channelName,
        direction: directionName,
        summary: input.summary.trim(),
        subject: subject || null,
        occurredAt,
        loggedById: current.userId,
      },
      select: { id: true },
    });
    if (input.direction === "OUTBOUND" && !row.firstResponseAt) {
      const updated = await tx.enquiry.updateMany({
        where: { id: row.id, revision: row.revision },
        data: { firstResponseAt: occurredAt, revision: { increment: 1 } },
      });
      if (updated.count !== 1) throw new CrmError(conflict, 409);
    }
    await writeAudit(
      {
        actorId: current.userId,
        action: "enquiry.communication",
        entityType: "CommunicationLog",
        entityId: entry.id,
        after: { enquiryId: row.id, channel: input.channel, direction: input.direction },
      },
      tx,
    );
  });
}

export async function attachMedia(
  userId: string,
  reference: string,
  mediaId: string,
): Promise<void> {
  const current = await actor(userId);
  const enquiry = await requireReadable(current, { reference });
  if (
    !canAttachEnquiryMedia(current.permissions) ||
    !canUpdateEnquiry(current.permissions, current.userId, enquiry.assignedUserId)
  ) {
    throw new CrmError(forbidden, 403);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mediaId)) {
    throw new CrmError(unavailable, 404);
  }
  const media = await db.mediaAsset.findUnique({ where: { id: mediaId }, select: { id: true } });
  if (!media) throw new CrmError(unavailable, 404);
  const attachment = await db.attachment.create({
    data: { ownerType: "ENQUIRY", ownerId: enquiry.id, mediaId: media.id },
    select: { id: true },
  });
  await writeAudit({
    actorId: current.userId,
    action: "enquiry.attachment",
    entityType: "Attachment",
    entityId: attachment.id,
    after: { enquiryId: enquiry.id, mediaId: media.id },
  });
}

export async function saveQueueView(userId: string, view: QueueView): Promise<void> {
  const current = await actor(userId);
  if (
    !seesAllEnquiries(current.permissions) &&
    !current.permissions.includes("enquiry.read.assigned")
  ) {
    throw new CrmError(forbidden, 403);
  }
  const nameError = queueViewNameError(view.name);
  if (nameError) throw new CrmError(nameError, 400);
  const next: QueueView = {
    name: view.name.trim(),
    q: view.q.trim().slice(0, 80),
    status: isEnquiryStatus(view.status) ? view.status : "",
    assignment: seesAllEnquiries(current.permissions) ? view.assignment : "mine",
  };
  const existing = await ownViews(current.userId);
  const replacing = existing.some((item) => item.name.toLowerCase() === next.name.toLowerCase());
  if (!replacing && existing.length >= 20) throw new CrmError("Save up to 20 queue views.", 400);
  const stored = upsertQueueView(existing, next) as Prisma.InputJsonValue;
  await db.systemSetting.upsert({
    where: { key: viewStorageKey(current.userId) },
    update: { value: stored, updatedById: current.userId },
    create: { key: viewStorageKey(current.userId), value: stored, updatedById: current.userId },
  });
  await writeAudit({
    actorId: current.userId,
    action: "enquiry.view.save",
    entityType: "User",
    entityId: current.userId,
    after: { name: next.name },
  });
}

export async function deleteQueueView(userId: string, name: string): Promise<void> {
  const current = await actor(userId);
  const existing = await ownViews(current.userId);
  const next = existing.filter((view) => view.name.toLowerCase() !== name.trim().toLowerCase());
  const stored = next as Prisma.InputJsonValue;
  await db.systemSetting.upsert({
    where: { key: viewStorageKey(current.userId) },
    update: { value: stored, updatedById: current.userId },
    create: { key: viewStorageKey(current.userId), value: stored, updatedById: current.userId },
  });
}

export async function operationsReport(userId: string): Promise<OperationsReport> {
  const current = await actor(userId);
  if (!canReadOperationsReport(current.permissions)) throw new CrmError(forbidden, 403);
  const where = queueWhere(current, {
    q: "",
    status: "",
    assignment: seesAllEnquiries(current.permissions) ? "all" : "mine",
    page: 1,
  });
  const [grouped, rows, target] = await Promise.all([
    db.enquiry.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.enquiry.findMany({
      where,
      select: { status: true, assignedUserId: true, createdAt: true, firstResponseAt: true },
    }),
    slaTarget(),
  ]);
  const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
  const now = new Date();
  let waiting = 0;
  let waitingPast = 0;
  let answeredInside = 0;
  let answeredPast = 0;
  let oldestOpenMinutes: number | null = null;
  let unassigned = 0;
  for (const row of rows) {
    const reading = readingFor(row, target, now);
    const open = isOpenEnquiryStatus(row.status);
    if (open && !row.assignedUserId) unassigned += 1;
    if (open && target.hours) {
      const age = businessMinutesBetween(row.createdAt, now, target.hours);
      oldestOpenMinutes = oldestOpenMinutes === null ? age : Math.max(oldestOpenMinutes, age);
    }
    if (!open && !row.firstResponseAt) continue;
    if (reading.kind === "waiting") waiting += 1;
    if (reading.kind === "waiting-past" && open) waitingPast += 1;
    if (reading.kind === "answered-inside") answeredInside += 1;
    if (reading.kind === "answered-past") answeredPast += 1;
  }
  return {
    targetMinutes: target.target,
    counts: (Object.keys(nextStatuses) as EnquiryStatusName[]).map((status) => ({
      status,
      label: statusLabel(status),
      count: counts.get(asStatus(status)) ?? 0,
    })),
    unassigned,
    waiting,
    waitingPast,
    answeredInside,
    answeredPast,
    oldestOpenMinutes,
  };
}

export async function exportEnquiries(
  userId: string,
  filters: QueueFilters,
): Promise<EnquiryExport> {
  const current = await actor(userId);
  if (!canExportEnquiries(current.permissions)) throw new CrmError(forbidden, 403);
  if (
    !seesAllEnquiries(current.permissions) &&
    !current.permissions.includes("enquiry.read.assigned")
  ) {
    throw new CrmError(forbidden, 403);
  }
  const scoped = scopedFilters(current, { ...filters, page: 1 });
  const where = queueWhere(current, scoped);
  const [cap, target, total] = await Promise.all([
    readSetting("export.maxRows").then((value) => exportRowCap(value)),
    slaTarget(),
    db.enquiry.count({ where }),
  ]);
  const rows = await db.enquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: cap,
    select: {
      reference: true,
      status: true,
      createdAt: true,
      firstResponseAt: true,
      terminalReasonCode: true,
      customer: { select: { name: true, email: true } },
      assignedUser: { select: { email: true } },
    },
  });
  const now = new Date();
  const exported: ExportRow[] = rows.map((row) => {
    const reading = readingFor(row, target, now);
    return {
      reference: row.reference,
      status: row.status,
      customer_email: row.customer.email,
      customer_name: row.customer.name,
      assignee_email: row.assignedUser?.email ?? "",
      created_at: row.createdAt.toISOString(),
      first_response_at: row.firstResponseAt?.toISOString() ?? "",
      sla: slaLabel(reading),
      elapsed_business_minutes: String(reading.elapsedMinutes),
      terminal_reason: row.terminalReasonCode ?? "",
    };
  });
  await writeAudit({
    actorId: current.userId,
    action: "enquiry.export",
    entityType: "User",
    entityId: current.userId,
    after: {
      rows: exported.length,
      capped: total > exported.length,
      status: scoped.status,
      assignment: scoped.assignment satisfies AssignmentFilter,
    },
  });
  return { csv: toCsv(exported), rows: exported.length, capped: total > exported.length, cap };
}
