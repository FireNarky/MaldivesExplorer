import { openEnquiryStatuses } from "@/modules/enquiries/rules";

export const enquiryStatuses = [
  "NEW",
  "CONTACT_ATTEMPTED",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "NEGOTIATION",
  "WON",
  "LOST",
  "CLOSED",
] as const;

export type EnquiryStatusName = (typeof enquiryStatuses)[number];

export const statusLabels: Record<EnquiryStatusName, string> = {
  NEW: "Received",
  CONTACT_ATTEMPTED: "Contact attempted",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTED: "Quoted",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  CLOSED: "Closed",
};

export const nextStatuses: Record<EnquiryStatusName, readonly EnquiryStatusName[]> = {
  NEW: ["CONTACT_ATTEMPTED", "CONTACTED", "LOST", "CLOSED"],
  CONTACT_ATTEMPTED: ["CONTACT_ATTEMPTED", "CONTACTED", "LOST"],
  CONTACTED: ["QUALIFIED", "LOST", "CLOSED"],
  QUALIFIED: ["QUOTED", "NEGOTIATION", "LOST"],
  QUOTED: ["NEGOTIATION", "WON", "LOST", "CLOSED"],
  NEGOTIATION: ["QUOTED", "WON", "LOST", "CLOSED"],
  WON: ["CLOSED"],
  LOST: ["CONTACTED"],
  CLOSED: ["CONTACTED"],
};

export const communicationChannels = ["EMAIL", "PHONE", "PORTAL", "WHATSAPP"] as const;
export type CommunicationChannelName = (typeof communicationChannels)[number];

export const taskStatuses = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type TaskStatusName = (typeof taskStatuses)[number];

export const assignmentFilters = ["all", "mine", "unassigned"] as const;
export type AssignmentFilter = (typeof assignmentFilters)[number];

const openStatuses = new Set<string>(openEnquiryStatuses);

export function isEnquiryStatus(value: string): value is EnquiryStatusName {
  return enquiryStatuses.some((status) => status === value);
}

export function isCommunicationChannel(value: string): value is CommunicationChannelName {
  return communicationChannels.some((channel) => channel === value);
}

export function isTaskStatus(value: string): value is TaskStatusName {
  return taskStatuses.some((status) => status === value);
}

export function isOpenEnquiryStatus(value: string): boolean {
  return openStatuses.has(value);
}

export type BusinessHours = {
  timezone: string;
  days: string[];
  start: string;
  end: string;
};

export type QueueFilters = {
  q: string;
  status: string;
  assignment: AssignmentFilter;
  page: number;
};

export type QueueView = {
  name: string;
  q: string;
  status: string;
  assignment: AssignmentFilter;
};

export type SlaKind = "none" | "waiting" | "waiting-past" | "answered-inside" | "answered-past";

export type SlaReading = {
  kind: SlaKind;
  elapsedMinutes: number;
};

export type TransitionInput = {
  from: EnquiryStatusName;
  to: EnquiryStatusName;
  canAssign: boolean;
  reasonCode: string;
  wonReference: string;
  followUp: string;
  checklist: boolean;
  channel: string;
  hasSentQuote: boolean;
  hasAcceptedQuote: boolean;
};

export type ExportRow = {
  reference: string;
  status: string;
  customer_email: string;
  customer_name: string;
  assignee_email: string;
  created_at: string;
  first_response_at: string;
  sla: string;
  elapsed_business_minutes: string;
  terminal_reason: string;
};

export const exportColumns = [
  "reference",
  "status",
  "customer_email",
  "customer_name",
  "assignee_email",
  "created_at",
  "first_response_at",
  "sla",
  "elapsed_business_minutes",
  "terminal_reason",
] as const satisfies readonly (keyof ExportRow)[];

const weekdayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export function statusLabel(status: string): string {
  return isEnquiryStatus(status) ? statusLabels[status] : status;
}

export function parseQueueFilters(input: {
  q?: string;
  status?: string;
  assignment?: string;
  page?: string;
}): QueueFilters {
  const status = input.status && isEnquiryStatus(input.status) ? input.status : "";
  const assignment = assignmentFilters.find((item) => item === input.assignment) ?? "all";
  const page = Number(input.page);
  return {
    q: (input.q ?? "").trim().slice(0, 80),
    status,
    assignment,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 200) : 1,
  };
}

export function queuePath(filters: QueueFilters, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.assignment !== "all") params.set("assignment", filters.assignment);
  if (filters.page > 1) params.set("page", String(filters.page));
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/admin/enquiries?${query}` : "/admin/enquiries";
}

export function transitionBlock(input: TransitionInput): string | null {
  if (!nextStatuses[input.from].includes(input.to)) return "That status change is not available.";
  if (
    (input.from === "LOST" || input.from === "CLOSED") &&
    input.to === "CONTACTED" &&
    !input.canAssign
  ) {
    return "Reopening a closed enquiry needs assignment permission.";
  }
  if (input.to === "LOST" && !input.reasonCode.trim()) return "Choose a loss reason.";
  if (input.to === "CLOSED" && !input.reasonCode.trim()) return "Choose a closure reason.";
  if (input.to === "QUOTED" && !input.hasSentQuote) return "A sent quote is required.";
  if (input.to === "WON" && (!input.hasAcceptedQuote || !input.wonReference.trim())) {
    return "An accepted quote and an operational reference are required.";
  }
  if (input.to === "NEGOTIATION" && !input.followUp.trim()) return "Enter a follow-up date.";
  if (input.to === "QUALIFIED" && !input.checklist) return "Confirm the qualification checklist.";
  if (input.to === "CONTACT_ATTEMPTED" && !isCommunicationChannel(input.channel)) {
    return "Choose a channel.";
  }
  return null;
}

export function pickLeastLoaded(rows: readonly { id: string; openCount: number }[]): string | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort(
    (left, right) => left.openCount - right.openCount || left.id.localeCompare(right.id),
  );
  return sorted[0]?.id ?? null;
}

export function positiveInt(value: unknown, fallback: number, max: number): number {
  const raw =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(raw) || raw < 1) return fallback;
  return Math.min(raw, max);
}

export function exportRowCap(value: unknown): number {
  return positiveInt(value, 5000, 5000);
}

export function booleanSetting(value: unknown): boolean {
  return value === true;
}

function parseClock(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match?.[1] || !match[2]) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function parseBusinessHours(value: unknown): BusinessHours | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const timezone = typeof record.timezone === "string" ? record.timezone : "";
  const start = typeof record.start === "string" ? record.start : "";
  const end = typeof record.end === "string" ? record.end : "";
  const days = Array.isArray(record.days)
    ? record.days.filter((day): day is string => typeof day === "string")
    : [];
  if (!timezone || !parseClock(start) || !parseClock(end) || days.length === 0) return null;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    return null;
  }
  return { timezone, start, end, days: days.map((day) => day.toUpperCase()) };
}

function zoneParts(date: Date, timeZone: string) {
  const bag: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const hour = Number(bag.hour ?? "0");
  return {
    year: Number(bag.year ?? "0"),
    month: Number(bag.month ?? "1"),
    day: Number(bag.day ?? "1"),
    hour: hour === 24 ? 0 : hour,
    minute: Number(bag.minute ?? "0"),
    weekday: (bag.weekday ?? "").toUpperCase(),
  };
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const local = zoneParts(instant, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const instantMinute = Math.floor(instant.getTime() / 60000) * 60000;
  return asUtc - instantMinute;
}

export function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let pass = 0; pass < 2; pass += 1) {
    utc = Date.UTC(year, month - 1, day, hour, minute) - zoneOffsetMs(new Date(utc), timeZone);
  }
  return new Date(utc);
}

function addCalendarDay(year: number, month: number, day: number) {
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export function businessMinutesBetween(start: Date, end: Date, hours: BusinessHours): number {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end.getTime() <= start.getTime()) return 0;
  const open = parseClock(hours.start);
  const close = parseClock(hours.end);
  if (!open || !close) return 0;
  const allowed = new Set(hours.days.map((day) => day.toUpperCase()));
  try {
    const first = zoneParts(start, hours.timezone);
    let cursor = { year: first.year, month: first.month, day: first.day };
    let total = 0;
    for (let guard = 0; guard < 400; guard += 1) {
      const dayStart = zonedToUtc(
        cursor.year,
        cursor.month,
        cursor.day,
        open.hour,
        open.minute,
        hours.timezone,
      );
      if (dayStart.getTime() >= end.getTime()) break;
      const dayEnd = zonedToUtc(
        cursor.year,
        cursor.month,
        cursor.day,
        close.hour,
        close.minute,
        hours.timezone,
      );
      const weekday = zoneParts(dayStart, hours.timezone).weekday;
      if (allowed.has(weekday) && weekdayNames.includes(weekday) && dayEnd > dayStart) {
        const from = Math.max(start.getTime(), dayStart.getTime());
        const to = Math.min(end.getTime(), dayEnd.getTime());
        if (to > from) total += Math.floor((to - from) / 60000);
      }
      cursor = addCalendarDay(cursor.year, cursor.month, cursor.day);
    }
    return total;
  } catch {
    return 0;
  }
}

export function parseStaffInstant(value: string, timeZone = "Indian/Maldives"): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const dated = new Date(trimmed);
    return Number.isNaN(dated.getTime()) ? null : dated;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match?.[1] || !match[2] || !match[3] || !match[4] || !match[5]) return null;
  try {
    return zonedToUtc(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      timeZone,
    );
  } catch {
    return null;
  }
}

export function readSla(input: {
  createdAt: Date;
  firstResponseAt: Date | null;
  now: Date;
  targetMinutes: number | null;
  hours: BusinessHours | null;
}): SlaReading {
  if (!input.hours || input.targetMinutes === null || input.targetMinutes < 1) {
    return { kind: "none", elapsedMinutes: 0 };
  }
  if (input.firstResponseAt) {
    const elapsedMinutes = businessMinutesBetween(
      input.createdAt,
      input.firstResponseAt,
      input.hours,
    );
    return {
      kind: elapsedMinutes > input.targetMinutes ? "answered-past" : "answered-inside",
      elapsedMinutes,
    };
  }
  const elapsedMinutes = businessMinutesBetween(input.createdAt, input.now, input.hours);
  return {
    kind: elapsedMinutes > input.targetMinutes ? "waiting-past" : "waiting",
    elapsedMinutes,
  };
}

export function slaLabel(reading: SlaReading): string {
  if (reading.kind === "none") return "No internal target";
  if (reading.kind === "waiting") return `Waiting, ${reading.elapsedMinutes} business minutes`;
  if (reading.kind === "waiting-past") {
    return `Past the internal target, ${reading.elapsedMinutes} business minutes`;
  }
  if (reading.kind === "answered-inside") return "First response inside the target";
  return "First response past the target";
}

export function formatStaffDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Indian/Maldives",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function requiredText(
  value: string,
  empty: string,
  max: number,
  tooLong: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return empty;
  if (trimmed.length > max) return tooLong;
  return null;
}

export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export function toCsv(rows: readonly ExportRow[]): string {
  const header = exportColumns.join(",");
  const body = rows.map((row) => exportColumns.map((column) => csvCell(row[column])).join(","));
  return [header, ...body].join("\n");
}

export function parseQueueViews(value: unknown): QueueView[] {
  if (!Array.isArray(value)) return [];
  const views: QueueView[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim().slice(0, 40) : "";
    const assignment = assignmentFilters.find((filter) => filter === record.assignment);
    const status =
      typeof record.status === "string" && isEnquiryStatus(record.status) ? record.status : "";
    if (!name || !assignment) continue;
    views.push({
      name,
      q: typeof record.q === "string" ? record.q.slice(0, 80) : "",
      status,
      assignment,
    });
  }
  return views.slice(0, 20);
}

export function upsertQueueView(views: readonly QueueView[], next: QueueView): QueueView[] {
  const rest = views.filter((view) => view.name.toLowerCase() !== next.name.toLowerCase());
  return [next, ...rest].slice(0, 20);
}

export function queueViewNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a view name.";
  if (trimmed.length > 40) return "Enter a view name of 40 characters or fewer.";
  return null;
}
