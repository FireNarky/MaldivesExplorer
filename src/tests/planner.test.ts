import { describe, expect, it } from "vitest";
import {
  classifyTravelerAge,
  draftExpired,
  emptyDraft,
  parseSubmission,
  qualification,
  stepIssues,
  windowsOverlap,
} from "@/modules/enquiries/rules";

function readyDraft() {
  const draft = emptyDraft("exercise-key");
  draft.name = "A Guest";
  draft.email = "Guest@Example.com";
  draft.consent = true;
  draft.adultCount = "2";
  draft.travelStart = "2026-06-01";
  draft.travelEnd = "2026-06-08";
  draft.budgetMin = "1000";
  draft.budgetMax = "2500";
  draft.tripTypeId = "11111111-1111-4111-8111-111111111111";
  draft.resortIds = ["22222222-2222-4222-8222-222222222222"];
  return draft;
}

describe("trip plan rules", () => {
  it("keeps a valid plan and asks for the open parts", () => {
    const draft = readyDraft();
    draft.tripTypeId = "";
    draft.resortIds = [];
    const parsed = parseSubmission(draft, "2026-10-10");
    expect("submission" in parsed).toBe(true);
    if (!("submission" in parsed)) return;
    expect(parsed.submission.email).toBe("guest@example.com");
    expect(parsed.submission.budgetCurrency).toBe("USD");
    const gaps = qualification(draft);
    expect(gaps.missing).toEqual([
      "Choose a trip type.",
      "Add a preferred resort, offer, or interest.",
    ]);
    expect(gaps.score).toBe(2);
  });

  it("rejects a child age outside 0 through 11 and classifies infants", () => {
    const draft = readyDraft();
    draft.childAges = ["12"];
    expect(stepIssues("party", draft)["childAges.0"]).toBe(
      "Enter an age from 0 through 11. Ages 12 and over count as adults.",
    );
    expect(classifyTravelerAge(1)).toBe("INFANT");
    expect(classifyTravelerAge(8)).toBe("CHILD");
    expect(classifyTravelerAge(12)).toBeNull();
  });

  it("flags an overlapping window and still accepts the second plan shape", () => {
    expect(windowsOverlap("2026-06-01", "2026-06-08", "2026-06-07", "2026-06-12")).toBe(true);
    expect(windowsOverlap("2026-06-01", "2026-06-08", "2026-06-09", "2026-06-12")).toBe(false);
    expect(windowsOverlap(null, null, "2026-06-01", "2026-06-08")).toBe(false);
    const parsed = parseSubmission(readyDraft(), "2026-10-10");
    expect("errors" in parsed).toBe(false);
  });

  it("expires a device draft after the configured number of days", () => {
    const now = new Date("2026-10-11T00:00:00.000Z");
    expect(draftExpired("2026-09-01T00:00:00.000Z", now, 30)).toBe(true);
    expect(draftExpired("2026-10-01T00:00:00.000Z", now, 30)).toBe(false);
  });

  it("requires consent and blocks a budget that is reversed", () => {
    const draft = readyDraft();
    draft.consent = false;
    expect(stepIssues("review", draft).consent).toBe(
      "Consent is required before this plan can be sent.",
    );
    draft.consent = true;
    draft.budgetMin = "3000";
    draft.budgetMax = "1000";
    expect(stepIssues("budget", draft).budgetMax).toBe(
      "The highest budget is below the lowest budget.",
    );
  });
});
