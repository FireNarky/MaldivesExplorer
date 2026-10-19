import { draftExpired, emptyDraft, isUuid, type PlannerDraft } from "@/modules/enquiries/rules";

const draftKey = "me.planner.v1";
const landingKey = "me.landing.v1";
const ackKey = "me.plan.ack";

export type PlanAcknowledgement = {
  reference: string;
  duplicate: boolean;
  missing: string[];
};

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function texts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function draftFrom(value: unknown): PlannerDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const base = emptyDraft(text(record.idempotencyKey));
  return {
    ...base,
    savedAt: text(record.savedAt) || base.savedAt,
    idempotencyKey: text(record.idempotencyKey),
    travelStart: text(record.travelStart),
    travelEnd: text(record.travelEnd),
    flexibility: text(record.flexibility),
    budgetMin: text(record.budgetMin),
    budgetMax: text(record.budgetMax),
    budgetCurrency: text(record.budgetCurrency) || "USD",
    adultCount: text(record.adultCount) || "1",
    childAges: texts(record.childAges).slice(0, 12),
    tripTypeId: text(record.tripTypeId),
    experienceIds: texts(record.experienceIds).filter(isUuid).slice(0, 50),
    resortIds: texts(record.resortIds).filter(isUuid).slice(0, 50),
    offerIds: texts(record.offerIds).filter(isUuid).slice(0, 50),
    accessibilityNeeds: text(record.accessibilityNeeds),
    requirements: text(record.requirements),
    name: text(record.name),
    email: text(record.email),
    phone: text(record.phone),
    countryCode: text(record.countryCode),
    consent: record.consent === true,
    source: text(record.source),
    medium: text(record.medium),
    campaign: text(record.campaign),
    referrer: text(record.referrer),
    landingPath: text(record.landingPath),
  };
}

export function loadPlannerDraft(ttlDays: number): {
  draft: PlannerDraft | null;
  expired: boolean;
} {
  const raw = readJson(draftKey);
  const parsed = draftFrom(raw);
  if (!parsed || !parsed.idempotencyKey) return { draft: null, expired: false };
  if (draftExpired(parsed.savedAt, new Date(), ttlDays)) {
    window.localStorage.removeItem(draftKey);
    return { draft: null, expired: true };
  }
  return { draft: parsed, expired: false };
}

export function writePlannerDraft(draft: PlannerDraft): void {
  window.localStorage.setItem(
    draftKey,
    JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
  );
}

export function clearPlannerDraft(): void {
  window.localStorage.removeItem(draftKey);
}

export function readLandingPath(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(landingKey) ?? "";
}

export function rememberLandingPath(): void {
  if (window.sessionStorage.getItem(landingKey)) return;
  window.sessionStorage.setItem(landingKey, `${window.location.pathname}${window.location.search}`);
}

export function writeAcknowledgement(ack: PlanAcknowledgement): void {
  window.sessionStorage.setItem(ackKey, JSON.stringify(ack));
}

export function readAcknowledgement(): PlanAcknowledgement | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(ackKey);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PlanAcknowledgement>;
    if (typeof parsed.reference !== "string" || !parsed.reference) return null;
    return {
      reference: parsed.reference,
      duplicate: parsed.duplicate === true,
      missing: Array.isArray(parsed.missing)
        ? parsed.missing.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return null;
  }
}
