import { describe, expect, it } from "vitest";
import { renderQuotePdf } from "@/modules/quotes/pdf";
import {
  acceptDecision,
  approvalDecision,
  composeTerms,
  defaultApprovalPolicy,
  documentText,
  formatMoney,
  headerFromLines,
  needsSecondApprover,
  parseMoney,
  priceLine,
  sentVersionIsFrozen,
  splitTerms,
  type PricedLine,
} from "@/modules/quotes/rules";

function line(
  itemType: PricedLine["itemType"],
  quantity: number,
  unit: string,
  tax = "0",
  discount = "0",
): PricedLine {
  const priced = priceLine({
    itemType,
    quantity,
    unitCents: parseMoney(unit) ?? 0,
    taxCents: parseMoney(tax) ?? 0,
    discountCents: parseMoney(discount) ?? 0,
  });
  if (!priced) throw new Error("line");
  return priced;
}

describe("quote totals", () => {
  it("reconciles accommodation, tax, fee, and discount lines", () => {
    const priced = [
      line("ACCOMMODATION", 2, "100.00", "10.00", "5.00"),
      line("TAX", 1, "8.00"),
      line("FEE", 1, "15.00"),
      line("DISCOUNT", 1, "20.00", "4.00", "3.00"),
    ];
    expect(priced[0]?.lineCents).toBe(20500);
    expect(priced[3]?.taxCents).toBe(0);
    expect(priced[3]?.lineCents).toBe(2000);
    const totals = headerFromLines(priced);
    expect(totals).toEqual({
      subtotalCents: 20000,
      taxCents: 1800,
      feeCents: 1500,
      discountCents: 2500,
      grandCents: 20800,
    });
    expect(formatMoney(totals?.grandCents ?? 0)).toBe("208.00");
  });

  it("asks for a second approver only above the seeded limits", () => {
    const under = headerFromLines([line("ACCOMMODATION", 1, "20000.00", "0", "2000.00")]);
    const overDiscount = headerFromLines([line("ACCOMMODATION", 1, "20000.00", "0", "2000.01")]);
    const atCap = headerFromLines([line("ACCOMMODATION", 1, "25000.00")]);
    const overCap = headerFromLines([line("ACCOMMODATION", 1, "25000.01")]);
    expect(under && needsSecondApprover(under, defaultApprovalPolicy)).toBe(false);
    expect(overDiscount && needsSecondApprover(overDiscount, defaultApprovalPolicy)).toBe(true);
    expect(atCap && needsSecondApprover(atCap, defaultApprovalPolicy)).toBe(false);
    expect(overCap && needsSecondApprover(overCap, defaultApprovalPolicy)).toBe(true);
  });
});

describe("quote approval and expiry", () => {
  it("keeps the preparer from being the only approver", () => {
    expect(
      approvalDecision({
        actorId: "author",
        createdById: "author",
        separateDuties: true,
        priorApproverIds: [],
        secondRequired: false,
      }),
    ).toBe("self");
    expect(
      approvalDecision({
        actorId: "approver-a",
        createdById: "author",
        separateDuties: true,
        priorApproverIds: [],
        secondRequired: true,
      }),
    ).toBe("record-first");
    expect(
      approvalDecision({
        actorId: "approver-a",
        createdById: "author",
        separateDuties: true,
        priorApproverIds: ["approver-a"],
        secondRequired: true,
      }),
    ).toBe("duplicate");
    expect(
      approvalDecision({
        actorId: "approver-b",
        createdById: "author",
        separateDuties: true,
        priorApproverIds: ["approver-a"],
        secondRequired: true,
      }),
    ).toBe("approve");
  });

  it("refuses an expired sent quote and a draft", () => {
    const now = new Date("2026-10-12T12:00:00.000Z");
    expect(acceptDecision("SENT", new Date("2026-10-12T12:00:00.000Z"), now)).toBe("expired");
    expect(acceptDecision("SENT", new Date("2026-10-13T00:00:00.000Z"), now)).toBe("ok");
    expect(acceptDecision("DRAFT", new Date("2026-10-13T00:00:00.000Z"), now)).toBe("state");
    expect(acceptDecision("EXPIRED", new Date("2026-10-13T00:00:00.000Z"), now)).toBe("state");
    expect(sentVersionIsFrozen(now)).toBe(true);
    expect(sentVersionIsFrozen(null)).toBe(false);
  });
});

describe("quote document", () => {
  it("round-trips inclusions and writes the same sections into the PDF", () => {
    const terms = composeTerms({
      inclusions: "Breakfast",
      exclusions: "Flights",
      terms: "Pay the deposit to proceed.",
    });
    expect(splitTerms(terms)).toEqual({
      inclusions: "Breakfast",
      exclusions: "Flights",
      terms: "Pay the deposit to proceed.",
    });
    const lines = documentText({
      reference: "ME-Q-000001",
      versionNo: 1,
      currency: "USD",
      welcome: "Your quote",
      overview: "Four nights",
      segments: [],
      transfers: [],
      activities: [],
      lines: [{ description: "Stay", amount: "USD 100.00" }],
      subtotal: "USD 100.00",
      taxTotal: "USD 0.00",
      feeTotal: "USD 0.00",
      discountTotal: "USD 0.00",
      grandTotal: "USD 100.00",
      terms,
      expiresOn: "2026-12-31",
    });
    expect(lines).toEqual(
      expect.arrayContaining([
        "Welcome",
        "Overview",
        "Accommodation",
        "Transfers",
        "Activities",
        "Pricing",
        "Terms",
        "Next steps",
      ]),
    );
    const pdf = new TextDecoder().decode(renderQuotePdf(lines));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("ME-Q-000001");
    expect(pdf).toContain("Maldives Explorer");
    expect(pdf).toContain("USD 100.00");
  });
});
