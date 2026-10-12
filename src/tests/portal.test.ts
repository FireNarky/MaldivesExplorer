import { describe, expect, it } from "vitest";
import {
  consentWrites,
  formatAmount,
  isCustomerVisibleQuote,
  messageBodyError,
  profileProblems,
  safeAccountPath,
} from "@/modules/customers/rules";
import { canReadOwnCustomer } from "@/modules/customers/policies";

describe("account portal rules", () => {
  it("keeps a customer on their own records", () => {
    expect(canReadOwnCustomer("user-a", "user-a")).toBe(true);
    expect(canReadOwnCustomer("user-a", "user-b")).toBe(false);
    expect(canReadOwnCustomer("user-a", null)).toBe(false);
    expect(canReadOwnCustomer("", "user-a")).toBe(false);
  });

  it("shows a sent quote and hides a draft", () => {
    expect(isCustomerVisibleQuote("SENT", new Date("2026-10-12T00:00:00.000Z"))).toBe(true);
    expect(isCustomerVisibleQuote("DRAFT", null)).toBe(false);
    expect(isCustomerVisibleQuote("APPROVED", null)).toBe(false);
    expect(isCustomerVisibleQuote("SENT", null)).toBe(false);
  });

  it("checks profile fields and message length", () => {
    expect(
      profileProblems({ name: "  ", phone: "abc", countryCode: "maldives", locale: "dv" }),
    ).toEqual({
      name: "Enter a name of 120 characters or fewer.",
      phone: "Enter a phone number of 40 characters or fewer.",
      countryCode: "Enter a two-letter country code.",
      locale: "English is the available language.",
    });
    expect(
      profileProblems({ name: "A Guest", phone: "", countryCode: "mv", locale: "en" }),
    ).toEqual({});
    expect(messageBodyError("  ")).toBe("Enter a message.");
    expect(messageBodyError("Hello")).toBeNull();
  });

  it("writes consent only when the choice changes", () => {
    expect(consentWrites({}, { ACCOUNT: false, ANALYTICS: true })).toEqual([
      { purpose: "ANALYTICS", status: "GRANTED" },
    ]);
    expect(consentWrites({ ANALYTICS: "GRANTED" }, { ANALYTICS: false })).toEqual([
      { purpose: "ANALYTICS", status: "WITHDRAWN" },
    ]);
    expect(consentWrites({ ACCOUNT: "GRANTED" }, { ACCOUNT: true })).toEqual([]);
  });

  it("formats an amount and keeps account return paths on this site", () => {
    expect(formatAmount({ toString: () => "100" })).toBe("100.00");
    expect(formatAmount({ toString: () => "100.5" })).toBe("100.50");
    expect(safeAccountPath("/account/enquiries")).toBe("/account/enquiries");
    expect(safeAccountPath("/account?claim=abc")).toBe("/account?claim=abc");
    expect(safeAccountPath("https://example.com")).toBeNull();
    expect(safeAccountPath("//account")).toBeNull();
  });
});
