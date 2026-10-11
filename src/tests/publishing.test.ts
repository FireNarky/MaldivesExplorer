import { describe, expect, it } from "vitest";
import { canTransitionWith } from "@/modules/publishing/policies";
import {
  canTransition,
  editableStatus,
  publicationStamp,
  transitionNeedsPublishPermission,
} from "@/modules/publishing/workflow";

const dates = {
  status: "DRAFT" as const,
  publishedAt: null,
  scheduledAt: null,
  unpublishedAt: null,
  archivedAt: null,
};

describe("publication workflow", () => {
  it("follows the draft, review, approval, and publish path", () => {
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(false);
    expect(canTransition("DRAFT", "IN_REVIEW")).toBe(true);
    const approved = publicationStamp({ ...dates, status: "IN_REVIEW" }, "APPROVED");
    const scheduled = new Date("2026-12-01T00:00:00.000Z");
    const published = publicationStamp(
      { ...approved, scheduledAt: scheduled },
      "PUBLISHED",
      undefined,
      new Date("2026-11-01T00:00:00.000Z"),
    );
    expect(published.publishedAt?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(editableStatus("PUBLISHED")).toBe(false);
    expect(editableStatus("DRAFT")).toBe(true);
  });

  it("requires a schedule time and a publish permission for publication", () => {
    expect(() => publicationStamp({ ...dates, status: "APPROVED" }, "SCHEDULED")).toThrow(
      "Choose a schedule time.",
    );
    expect(transitionNeedsPublishPermission("IN_REVIEW")).toBe(false);
    expect(transitionNeedsPublishPermission("PUBLISHED")).toBe(true);
    expect(canTransitionWith(["catalog.write"], "PUBLISHED", "catalog")).toBe(false);
    expect(canTransitionWith(["catalog.publish"], "PUBLISHED", "catalog")).toBe(true);
    expect(canTransitionWith(["content.write"], "IN_REVIEW", "content")).toBe(true);
  });
});
