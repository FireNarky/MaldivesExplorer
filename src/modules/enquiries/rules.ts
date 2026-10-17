import { z } from "zod";

export const plannerSteps = ["dates", "budget", "party", "preferences", "review"] as const;

export type PlannerStep = (typeof plannerSteps)[number];

export const plannerStepLabels = [
  "Dates",
  "Budget",
  "Travel type",
  "Preferences",
  "Review",
] as const;

export const openEnquiryStatuses = [
  "NEW",
  "CONTACT_ATTEMPTED",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "NEGOTIATION",
] as const;

export const defaultDraftTtlDays = 30;
export const idempotencyWindowHours = 24;
export const enquiryRateLimit = 5;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PlannerDraft = {
  savedAt: string;
  idempotencyKey: string;
  travelStart: string;
  travelEnd: string;
  flexibility: string;
  budgetMin: string;
  budgetMax: string;
  budgetCurrency: string;
  adultCount: string;
  childAges: string[];
  tripTypeId: string;
  experienceIds: string[];
  resortIds: string[];
  offerIds: string[];
  accessibilityNeeds: string;
  requirements: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  consent: boolean;
  source: string;
  medium: string;
  campaign: string;
  referrer: string;
  landingPath: string;
};

export type EnquirySubmission = {
  name: string;
  email: string;
  phone: string | null;
  countryCode: string | null;
  travelStart: string | null;
  travelEnd: string | null;
  flexibility: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  budgetCurrency: string | null;
  adultCount: number;
  childAges: number[];
  tripTypeId: string | null;
  experienceIds: string[];
  resortIds: string[];
  offerIds: string[];
  accessibilityNeeds: string | null;
  requirements: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  landingPath: string | null;
  noticeVersion: string;
};

export function emptyDraft(idempotencyKey = ""): PlannerDraft {
  return {
    savedAt: new Date(0).toISOString(),
    idempotencyKey,
    travelStart: "",
    travelEnd: "",
    flexibility: "",
    budgetMin: "",
    budgetMax: "",
    budgetCurrency: "USD",
    adultCount: "1",
    childAges: [],
    tripTypeId: "",
    experienceIds: [],
    resortIds: [],
    offerIds: [],
    accessibilityNeeds: "",
    requirements: "",
    name: "",
    email: "",
    phone: "",
    countryCode: "",
    consent: false,
    source: "",
    medium: "",
    campaign: "",
    referrer: "",
    landingPath: "",
  };
}

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function idempotencyKeyError(value: string): string | null {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(value)) {
    return "The submission key is not valid.";
  }
  return null;
}

export function draftExpired(savedAt: string, now: Date, ttlDays: number): boolean {
  const saved = Date.parse(savedAt);
  if (Number.isNaN(saved)) return true;
  const days = Number.isInteger(ttlDays) && ttlDays > 0 ? ttlDays : defaultDraftTtlDays;
  return now.getTime() - saved > days * 24 * 60 * 60 * 1000;
}

export function windowsOverlap(
  startA: string | null,
  endA: string | null,
  startB: string | null,
  endB: string | null,
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && startB <= endA;
}

export function classifyTravelerAge(age: number): "INFANT" | "CHILD" | null {
  if (!Number.isInteger(age) || age < 0 || age > 11) return null;
  if (age <= 1) return "INFANT";
  return "CHILD";
}

function calendarDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

function money(value: string): string | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) return null;
  return amount.toFixed(2);
}

function cleanText(value: string, max: number): string | null {
  const text = value.trim();
  if (!text) return null;
  return text.length <= max ? text : null;
}

function uniqueIds(values: string[]): string[] {
  const ids: string[] = [];
  for (const value of values) {
    if (!isUuid(value) || ids.includes(value)) continue;
    ids.push(value);
    if (ids.length === 50) break;
  }
  return ids;
}

export function stepIssues(step: PlannerStep, draft: PlannerDraft): Record<string, string> {
  const issues: Record<string, string> = {};
  if (step === "dates" || step === "review") {
    const start = draft.travelStart.trim();
    const end = draft.travelEnd.trim();
    if (start || end) {
      if (!calendarDate(start)) issues.travelStart = "Enter the arrival date.";
      if (!calendarDate(end)) issues.travelEnd = "Enter the departure date.";
      if (!issues.travelStart && !issues.travelEnd && start > end) {
        issues.travelEnd = "The departure date is before the arrival date.";
      }
    }
    const flexibility = draft.flexibility.trim();
    if (flexibility.length > 200) issues.flexibility = "Flexibility can be 200 characters.";
  }
  if (step === "budget" || step === "review") {
    const min = draft.budgetMin.trim();
    const max = draft.budgetMax.trim();
    if (min || max) {
      const minValue = money(min);
      const maxValue = money(max);
      if (!minValue) issues.budgetMin = "Enter the lowest budget in USD.";
      if (!maxValue) issues.budgetMax = "Enter the highest budget in USD.";
      if (minValue && maxValue && Number(minValue) > Number(maxValue)) {
        issues.budgetMax = "The highest budget is below the lowest budget.";
      }
      if (draft.budgetCurrency.trim().toUpperCase() !== "USD") {
        issues.budgetCurrency = "The budget currency is USD.";
      }
    }
  }
  if (step === "party" || step === "review") {
    if (!/^\d+$/.test(draft.adultCount.trim())) issues.adultCount = "Enter the number of adults.";
    else {
      const adults = Number(draft.adultCount);
      if (adults < 1 || adults > 20) issues.adultCount = "Enter 1 to 20 adults.";
    }
    draft.childAges.forEach((value, index) => {
      const age = Number(value);
      if (classifyTravelerAge(age) === null) {
        issues[`childAges.${index}`] =
          "Enter an age from 0 through 11. Ages 12 and over count as adults.";
      }
    });
    if (draft.childAges.length > 12) issues.childAges = "A plan can list 12 children.";
    if (draft.tripTypeId.trim() && !isUuid(draft.tripTypeId.trim())) {
      issues.tripTypeId = "Choose a trip type.";
    }
  }
  if (step === "preferences" || step === "review") {
    if (draft.accessibilityNeeds.trim().length > 500) {
      issues.accessibilityNeeds = "Accessibility needs can be 500 characters.";
    }
    if (draft.requirements.trim().length > 2000) {
      issues.requirements = "The note can be 2,000 characters.";
    }
  }
  if (step === "review") {
    const name = draft.name.trim();
    if (name.length < 1 || name.length > 120) issues.name = "Enter your name.";
    const email = normalizeEmail(draft.email);
    if (!z.string().email().safeParse(email).success || email.length > 200) {
      issues.email = "Enter an email address.";
    }
    const phone = draft.phone.trim();
    if (phone.length > 40) issues.phone = "The phone number can be 40 characters.";
    const country = draft.countryCode.trim();
    if (country && !/^[A-Za-z]{2}$/.test(country)) {
      issues.countryCode = "Enter a two-letter country code.";
    }
    if (!draft.consent) issues.consent = "Consent is required before this plan can be sent.";
  }
  return issues;
}

export function qualification(draft: PlannerDraft): { score: number; missing: string[] } {
  const missing: string[] = [];
  let score = 0;
  if (calendarDate(draft.travelStart.trim()) && calendarDate(draft.travelEnd.trim())) score += 1;
  else missing.push("Add the travel dates.");
  if (money(draft.budgetMin.trim()) && money(draft.budgetMax.trim())) score += 1;
  else missing.push("Add a budget range.");
  if (isUuid(draft.tripTypeId.trim())) score += 1;
  else missing.push("Choose a trip type.");
  if (draft.resortIds.length + draft.experienceIds.length + draft.offerIds.length > 0) score += 1;
  else missing.push("Add a preferred resort, offer, or interest.");
  return { score, missing };
}

export function parseSubmission(
  draft: PlannerDraft,
  noticeVersion: string,
): { submission: EnquirySubmission } | { errors: Record<string, string> } {
  const errors = stepIssues("review", draft);
  if (Object.keys(errors).length > 0) return { errors };
  const start = calendarDate(draft.travelStart.trim());
  const end = calendarDate(draft.travelEnd.trim());
  const min = money(draft.budgetMin.trim());
  const max = money(draft.budgetMax.trim());
  const submission: EnquirySubmission = {
    name: draft.name.trim(),
    email: normalizeEmail(draft.email),
    phone: cleanText(draft.phone, 40),
    countryCode: draft.countryCode.trim() ? draft.countryCode.trim().toUpperCase() : null,
    travelStart: start,
    travelEnd: end,
    flexibility: cleanText(draft.flexibility, 200),
    budgetMin: min,
    budgetMax: max,
    budgetCurrency: min && max ? "USD" : null,
    adultCount: Number(draft.adultCount),
    childAges: draft.childAges.map((value) => Number(value)),
    tripTypeId: isUuid(draft.tripTypeId.trim()) ? draft.tripTypeId.trim() : null,
    experienceIds: uniqueIds(draft.experienceIds),
    resortIds: uniqueIds(draft.resortIds),
    offerIds: uniqueIds(draft.offerIds),
    accessibilityNeeds: cleanText(draft.accessibilityNeeds, 500),
    requirements: cleanText(draft.requirements, 2000),
    source: cleanText(draft.source, 80),
    medium: cleanText(draft.medium, 80),
    campaign: cleanText(draft.campaign, 80),
    referrer: cleanText(draft.referrer, 300),
    landingPath: cleanText(draft.landingPath, 300),
    noticeVersion: noticeVersion.trim() || "2026-10-10",
  };
  return { submission };
}

export function submissionFingerprint(submission: EnquirySubmission): string {
  return JSON.stringify(submission);
}
