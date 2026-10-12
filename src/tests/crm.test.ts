import { describe, expect, it } from "vitest";
import { canExportEnquiries, canReadEnquiry, canUpdateEnquiry } from "@/modules/crm/policies";
import {
  businessMinutesBetween,
  exportRowCap,
  parseQueueViews,
  pickLeastLoaded,
  readSla,
  toCsv,
  transitionBlock,
  upsertQueueView,
  type BusinessHours,
  type ExportRow,
  type TransitionInput,
} from "@/modules/crm/rules";

const hours: BusinessHours = {
  timezone: "Indian/Maldives",
  days: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"],
  start: "09:00",
  end: "17:00",
};

const baseTransition: TransitionInput = {
  from: "NEW",
  to: "CONTACTED",
  canAssign: false,
  reasonCode: "",
  wonReference: "",
  followUp: "",
  checklist: false,
  channel: "",
  hasSentQuote: false,
  hasAcceptedQuote: false,
};

describe("enquiry queue rules", () => {
  it("keeps a consultant on assigned enquiries", () => {
    expect(canReadEnquiry(["enquiry.read.assigned"], "consultant-a", "consultant-a")).toBe(true);
    expect(canReadEnquiry(["enquiry.read.assigned"], "consultant-a", "consultant-b")).toBe(false);
    expect(canReadEnquiry(["enquiry.read.assigned"], "consultant-a", null)).toBe(false);
    expect(canReadEnquiry(["enquiry.read.all"], "auditor", null)).toBe(true);
    expect(canUpdateEnquiry(["enquiry.read.all"], "auditor", null)).toBe(false);
    expect(
      canUpdateEnquiry(["enquiry.read.assigned", "enquiry.update"], "consultant-a", "consultant-a"),
    ).toBe(true);
    expect(canExportEnquiries(["enquiry.read.all", "report.read"])).toBe(false);
    expect(canExportEnquiries(["enquiry.export"])).toBe(true);
  });

  it("requires a reason, a quote, and permission at the matching status", () => {
    expect(transitionBlock({ ...baseTransition, to: "LOST" })).toBe("Choose a loss reason.");
    expect(transitionBlock({ ...baseTransition, to: "CLOSED" })).toBe("Choose a closure reason.");
    expect(transitionBlock({ ...baseTransition, from: "QUALIFIED", to: "QUOTED" })).toBe(
      "A sent quote is required.",
    );
    expect(
      transitionBlock({
        ...baseTransition,
        from: "QUOTED",
        to: "WON",
        hasSentQuote: true,
        wonReference: "OP-1",
      }),
    ).toBe("An accepted quote and an operational reference are required.");
    expect(
      transitionBlock({
        ...baseTransition,
        from: "LOST",
        to: "CONTACTED",
        canAssign: false,
        reasonCode: "PRICE",
      }),
    ).toBe("Reopening a closed enquiry needs assignment permission.");
    expect(transitionBlock({ ...baseTransition, from: "NEW", to: "QUALIFIED" })).toBe(
      "That status change is not available.",
    );
    expect(
      transitionBlock({ ...baseTransition, to: "CONTACT_ATTEMPTED", channel: "PHONE" }),
    ).toBeNull();
  });

  it("measures the internal target inside Maldives business hours", () => {
    const start = new Date("2026-10-12T04:00:00.000Z");
    const twoHours = new Date("2026-10-12T06:00:00.000Z");
    const past = new Date("2026-10-12T06:01:00.000Z");
    expect(businessMinutesBetween(start, twoHours, hours)).toBe(120);
    expect(businessMinutesBetween(start, new Date("2026-10-12T12:00:00.000Z"), hours)).toBe(480);
    expect(
      businessMinutesBetween(
        new Date("2026-10-16T05:00:00.000Z"),
        new Date("2026-10-18T05:00:00.000Z"),
        hours,
      ),
    ).toBe(60);
    expect(
      readSla({ createdAt: start, firstResponseAt: twoHours, now: past, targetMinutes: 120, hours })
        .kind,
    ).toBe("answered-inside");
    expect(
      readSla({ createdAt: start, firstResponseAt: past, now: past, targetMinutes: 120, hours })
        .kind,
    ).toBe("answered-past");
    expect(
      readSla({ createdAt: start, firstResponseAt: null, now: past, targetMinutes: 120, hours })
        .kind,
    ).toBe("waiting-past");
  });

  it("caps an export and keeps saved views personal", () => {
    expect(exportRowCap(5000)).toBe(5000);
    expect(exportRowCap(10)).toBe(10);
    expect(exportRowCap(9000)).toBe(5000);
    expect(exportRowCap("no")).toBe(5000);
    expect(
      pickLeastLoaded([
        { id: "b", openCount: 1 },
        { id: "a", openCount: 1 },
      ]),
    ).toBe("a");
    const row: ExportRow = {
      reference: "ME-E-000001",
      status: "NEW",
      customer_email: "guest@example.com",
      customer_name: 'Guest "A"',
      assignee_email: "",
      created_at: "2026-10-12T04:00:00.000Z",
      first_response_at: "",
      sla: "Waiting, 10 business minutes",
      elapsed_business_minutes: "10",
      terminal_reason: "",
    };
    expect(toCsv([row])).toContain('"Guest ""A"""');
    expect(toCsv([row])).not.toContain("requirements");
    const views = upsertQueueView(
      parseQueueViews([{ name: "Open", q: "", status: "NEW", assignment: "mine" }]),
      {
        name: "open",
        q: "ME-E",
        status: "NEW",
        assignment: "mine",
      },
    );
    expect(views).toHaveLength(1);
    expect(views[0]?.q).toBe("ME-E");
  });
});
