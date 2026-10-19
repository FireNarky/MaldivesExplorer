import { describe, expect, it } from "vitest";
import {
  emptySearchCount,
  metricFormulas,
  ratioLabel,
  safeProperties,
} from "@/modules/analytics/rules";
import {
  emailError,
  readSubscriptionToken,
  signSubscription,
  subscribeDecision,
} from "@/modules/newsletter/rules";
import {
  featureAllowed,
  firstPartyEvidence,
  publicReviewLabel,
  publishBlock,
} from "@/modules/reviews/rules";

const secret = "stage-9-unit-secret-with-32-characters";

describe("review source and publication", () => {
  it("keeps an imported rating from reading as a first-party review", () => {
    expect(publicReviewLabel("IMPORTED", "VERIFIED")).toBe("Imported rating");
    expect(publicReviewLabel("IMPORTED", "VERIFIED")).not.toContain("First-party");
    expect(publicReviewLabel("FIRST_PARTY", "UNVERIFIED")).toBe("Editorial");
    expect(publicReviewLabel("FIRST_PARTY", "VERIFIED")).toBe("First-party review");
    expect(publicReviewLabel("EDITORIAL", "UNVERIFIED")).toBe("Editorial");
  });

  it("features only a published review that is not imported", () => {
    expect(featureAllowed({ source: "IMPORTED", moderation: "APPROVED", published: true })).toBe(
      false,
    );
    expect(featureAllowed({ source: "EDITORIAL", moderation: "APPROVED", published: true })).toBe(
      true,
    );
    expect(featureAllowed({ source: "EDITORIAL", moderation: "PENDING", published: false })).toBe(
      false,
    );
  });

  it("verifies first-party evidence only from a won enquiry or written permission", () => {
    expect(firstPartyEvidence({ wonEnquiry: false, writtenPermission: false })).toBe("UNVERIFIED");
    expect(firstPartyEvidence({ wonEnquiry: true, writtenPermission: false })).toBe("VERIFIED");
    expect(
      publishBlock({
        source: "FIRST_PARTY",
        verification: "UNVERIFIED",
        consentGranted: true,
        sourceReference: "",
        ratingBasis: "",
      }),
    ).toMatch(/won enquiry|written permission/);
    expect(
      publishBlock({
        source: "IMPORTED",
        verification: "UNVERIFIED",
        consentGranted: true,
        sourceReference: "Partner extract",
        ratingBasis: "Published score",
      }),
    ).toBeNull();
  });
});

describe("newsletter consent", () => {
  it("requires a new explicit marketing consent before an address returns", () => {
    expect(
      subscribeDecision({
        doubleOptIn: false,
        existing: "UNSUBSCRIBED",
        explicitMarketingConsent: false,
      }),
    ).toBe("blocked");
    expect(
      subscribeDecision({
        doubleOptIn: false,
        existing: "SUPPRESSED",
        explicitMarketingConsent: true,
      }),
    ).toBe("blocked");
    expect(
      subscribeDecision({
        doubleOptIn: false,
        existing: "UNSUBSCRIBED",
        explicitMarketingConsent: true,
      }),
    ).toBe("confirmed");
    expect(emailError("guest@example.com")).toBeNull();
  });

  it("round-trips a subscription token", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(readSubscriptionToken(signSubscription(id, secret), secret)).toBe(id);
    expect(readSubscriptionToken(`${id}.nope`, secret)).toBeNull();
  });
});

describe("operational metrics", () => {
  it("defines each formula before a value is shown", () => {
    expect(metricFormulas.responseRate).toMatch(/first response/);
    expect(metricFormulas.emptySearches).toMatch(/omitted/);
    expect(metricFormulas.acceptanceRate).toMatch(/accepted version/);
  });

  it("does not treat a missing measurement as zero", () => {
    expect(ratioLabel(null, 4, "No quotes are stored.")).toBeNull();
    expect(ratioLabel(1, 4, "No quotes are stored.")).toBe("1 of 4");
    expect(emptySearchCount([])).toBe(0);
    expect(emptySearchCount([{ resultCount: null }])).toBeNull();
    expect(emptySearchCount([{ resultCount: 0 }, { resultCount: null }])).toBe(1);
  });

  it("drops personal fields from an analytics payload", () => {
    expect(safeProperties({ email: "a@b.c", kind: "resort", query: "reef" }, true)).toEqual({
      kind: "resort",
      query: "reef",
    });
    expect(safeProperties({ kind: "resort", path: "/resorts/reef" }, false)).toEqual({
      kind: "resort",
    });
  });
});
