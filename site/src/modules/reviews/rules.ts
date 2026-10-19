export const reviewSources = ["FIRST_PARTY", "EDITORIAL", "IMPORTED"] as const;
export type ReviewSourceName = (typeof reviewSources)[number];

export const moderationStatuses = ["PENDING", "APPROVED", "HIDDEN", "REJECTED"] as const;
export type ModerationStatusName = (typeof moderationStatuses)[number];

export function isReviewSource(value: string): value is ReviewSourceName {
  return (reviewSources as readonly string[]).includes(value);
}

export function isModerationStatus(value: string): value is ModerationStatusName {
  return (moderationStatuses as readonly string[]).includes(value);
}

export function publicReviewLabel(
  source: ReviewSourceName,
  verification: "VERIFIED" | "UNVERIFIED" | "REJECTED" = "UNVERIFIED",
): string {
  if (source === "IMPORTED") return "Imported rating";
  if (source === "FIRST_PARTY" && verification === "VERIFIED") return "First-party review";
  return "Editorial";
}

export function presentedAsFirstParty(source: ReviewSourceName): boolean {
  return source === "FIRST_PARTY";
}

export function featureAllowed(input: {
  source: ReviewSourceName;
  moderation: ModerationStatusName;
  published: boolean;
}): boolean {
  return input.source !== "IMPORTED" && input.moderation === "APPROVED" && input.published;
}

export function firstPartyEvidence(input: {
  wonEnquiry: boolean;
  writtenPermission: boolean;
}): "VERIFIED" | "UNVERIFIED" {
  return input.wonEnquiry || input.writtenPermission ? "VERIFIED" : "UNVERIFIED";
}

export function writtenPermissionReference(value: string): boolean {
  const reference = value.trim();
  if (reference.length < 8 || reference.length > 200) return false;
  if (/^ME-E-\d{6}$/.test(reference)) return false;
  if (/^https?:\/\//i.test(reference)) return false;
  return true;
}

export function enquiryReference(value: string): string | null {
  const reference = value.trim();
  return /^ME-E-\d{6}$/.test(reference) ? reference : null;
}

export function publishBlock(input: {
  source: ReviewSourceName;
  verification: "VERIFIED" | "UNVERIFIED" | "REJECTED";
  consentGranted: boolean;
  sourceReference: string;
  ratingBasis: string;
}): string | null {
  if (!input.consentGranted) return "Record permission before publishing this review.";
  if (input.source === "FIRST_PARTY" && input.verification !== "VERIFIED") {
    return "A first-party review needs a won enquiry or a written permission reference.";
  }
  if (input.source === "IMPORTED" && input.sourceReference.trim().length < 3) {
    return "An imported rating needs its source.";
  }
  if (input.source === "IMPORTED" && input.ratingBasis.trim().length < 3) {
    return "An imported rating needs the basis of the score.";
  }
  return null;
}

export function parseRating(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d(\.\d)?$/.test(trimmed)) return null;
  const rating = Number(trimmed);
  if (rating < 0 || rating > 5) return null;
  return rating.toFixed(1);
}

export function clipText(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Enter ${label}.`);
  if (trimmed.length > max) throw new Error(`${label} is too long.`);
  return trimmed;
}

export function staffSourceLabel(source: ReviewSourceName): string {
  if (source === "FIRST_PARTY") return "First-party";
  if (source === "EDITORIAL") return "Editorial";
  return "Imported";
}

export function staffModerationLabel(status: ModerationStatusName): string {
  if (status === "PENDING") return "Waiting for review";
  if (status === "APPROVED") return "Approved";
  if (status === "HIDDEN") return "Hidden";
  return "Rejected";
}

export function evidenceLabel(status: "VERIFIED" | "UNVERIFIED" | "REJECTED"): string {
  if (status === "VERIFIED") return "First-party evidence recorded";
  if (status === "REJECTED") return "Evidence rejected";
  return "Evidence not established";
}
