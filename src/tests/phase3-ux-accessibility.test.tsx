import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(),
  AuthError: class AuthError extends Error {},
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: () => undefined,
  }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { AnalyticsConsent } from "@/components/discovery/analytics-consent";
import { ResortGallery } from "@/components/discovery/resort-gallery";
import { QuickSearchDialog } from "@/components/layout/quick-search-dialog";
import { PlannerForm } from "@/components/planner/planner-form";
import { CompareTray } from "@/components/shortlist/compare-tray";
import { PasswordField } from "@/components/ui/password-field";
import { LoginForm } from "@/app/login/login-form";
import RegisterPage from "@/app/register/page";
import PlanPage from "@/app/plan/page";
import NewsletterPage from "@/app/newsletter/page";
import { loadPlannerDraft } from "@/lib/planner/local";
import { db } from "@/lib/db";
import * as discoveryMod from "@/modules/discovery";
import * as wishlistMod from "@/modules/wishlist/service";
import * as authMod from "@/auth";
import * as shortlistLocal from "@/lib/shortlist/local";
import * as enquiriesService from "@/modules/enquiries/service";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.style.removeProperty("--me-compare-tray-h");
  document.documentElement.classList.remove("dark");
});

beforeEach(() => {
  // jsdom reports 0×0 boxes; publish a non-zero tray height for offset coordination tests.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 72,
    right: 400,
    width: 400,
    height: 72,
    toJSON() {
      return {};
    },
  });
});

const plannerProps = {
  noticeVersion: "2026-10-10",
  draftTtlDays: 30,
  tripTypes: [{ id: "11111111-1111-4111-8111-111111111111", label: "Honeymoon" }],
  resorts: [],
  experiences: [],
  savedResortIds: [] as string[],
  savedExperienceIds: [] as string[],
  savedOfferIds: [] as string[],
  accountEmail: null as string | null,
};

async function goToPartyStep() {
  render(<PlannerForm {...plannerProps} />);
  expect(await screen.findByRole("button", { name: /Continue to Budget/i })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Continue to Budget/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Continue to Travel type/i }));
  expect(await screen.findByRole("button", { name: /Continue to Preferences/i })).toBeTruthy();
}

describe("Phase 3 — dark-mode contrast tokens", () => {
  it("styles the planner trip type select for dark surfaces", async () => {
    document.documentElement.classList.add("dark");
    await goToPartyStep();
    const select = screen.getByLabelText(/Trip type/i);
    // Light surface stays white; dark theme must override with opaque dark tokens (not light ink on white).
    expect(select.className).toMatch(/dark:bg-\[#0c1c24\]/);
    expect(select.className).toMatch(/dark:text-white/);
    expect(select.className).toMatch(/dark:border-\[#223d4d\]/);
  });

  it("styles analytics consent with theme surfaces instead of a fixed white panel", async () => {
    const view = await AnalyticsConsent();
    expect(view).not.toBeNull();
    const { container } = render(view!);
    const section = container.querySelector('section[aria-label="Search analytics"]');
    expect(section?.className).toMatch(/bg-sand/);
    expect(section?.className).toMatch(/dark:bg-\[#071318\]/);
    expect(section?.className).not.toMatch(/(?:^|\s)bg-white(?:\s|$)/);
  });
});

describe("Phase 3 — compare tray offset for floating chrome", () => {
  it("publishes occupied bottom height when resorts are queued for compare", async () => {
    vi.spyOn(shortlistLocal, "readCompareIds").mockReturnValue([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
    render(<CompareTray />);
    expect(screen.getByRole("link", { name: /Compare resorts/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Clear compare/i })).toBeTruthy();
    await vi.waitFor(() => {
      const value = document.documentElement.style.getPropertyValue("--me-compare-tray-h");
      expect(value).toMatch(/px$/);
      expect(Number.parseFloat(value)).toBeGreaterThan(0);
    });
  });
});

describe("Phase 3 — planner child ages", () => {
  it("adds and removes child age rows, including a middle entry", async () => {
    await goToPartyStep();
    fireEvent.click(screen.getByRole("button", { name: /Add a child age/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add a child age/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add a child age/i }));
    expect(screen.getByLabelText("Child 1 age")).toBeTruthy();
    expect(screen.getByLabelText("Child 2 age")).toBeTruthy();
    expect(screen.getByLabelText("Child 3 age")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Child 1 age"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Child 2 age"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Child 3 age"), { target: { value: "7" } });

    fireEvent.click(screen.getByRole("button", { name: "Remove child 2" }));
    expect(screen.queryByLabelText("Child 3 age")).toBeNull();
    expect((screen.getByLabelText("Child 1 age") as HTMLInputElement).value).toBe("3");
    expect((screen.getByLabelText("Child 2 age") as HTMLInputElement).value).toBe("7");

    fireEvent.click(screen.getByRole("button", { name: "Remove child 2" }));
    expect(screen.queryByLabelText("Child 2 age")).toBeNull();
    expect((screen.getByLabelText("Child 1 age") as HTMLInputElement).value).toBe("3");
  });

  it("persists removed child ages in the device draft", async () => {
    await goToPartyStep();
    fireEvent.click(screen.getByRole("button", { name: /Add a child age/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add a child age/i }));
    fireEvent.change(screen.getByLabelText("Child 1 age"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Child 2 age"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove child 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to Preferences/i }));

    const stored = loadPlannerDraft(30);
    expect(stored.draft?.childAges).toEqual(["6"]);
  });

  it("clears age validation after a bad row is removed", async () => {
    await goToPartyStep();
    fireEvent.click(screen.getByRole("button", { name: /Add a child age/i }));
    fireEvent.change(screen.getByLabelText("Child 1 age"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Preferences/i }));
    expect(screen.getAllByText(/Enter an age from 0 through 11/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Remove child 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to Preferences/i }));
    expect(screen.queryByText(/Enter an age from 0 through 11/i)).toBeNull();
    expect(await screen.findByRole("button", { name: /Continue to Review/i })).toBeTruthy();
  });
});

describe("Phase 3 — register password visibility", () => {
  it("toggles password visibility without submitting and exposes the right label", () => {
    const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    const { container } = render(
      <form
        onSubmit={(event) => {
          onSubmit(event);
        }}
      >
        <PasswordField id="reg-password" name="password" withIcon />
        <button type="submit">Create</button>
      </form>,
    );
    const input = container.querySelector("#reg-password") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(input.type).toBe("password");
    fireEvent.click(toggle);
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.type).toBe("password");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders a working password toggle on the registration page", async () => {
    const view = await RegisterPage({ searchParams: Promise.resolve({}) });
    render(view);
    const input = document.getElementById("reg-password") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.type).toBe("text");
  });
});

describe("Phase 3 — resort gallery composition", () => {
  it("renders nothing for zero images", () => {
    const { container } = render(<ResortGallery images={[]} />);
    expect(container.querySelector('[aria-label="Photos"]')).toBeNull();
  });

  it("uses a single-column layout for one image", () => {
    const { container } = render(
      <ResortGallery images={[{ media: { id: "m1", altText: "Overwater villa" } }]} />,
    );
    const section = container.querySelector('[aria-label="Photos"]') as HTMLElement;
    expect(section.getAttribute("data-gallery-count")).toBe("1");
    expect(section.className).not.toMatch(/sm:grid-cols-3/);
    expect(screen.getByAltText("Overwater villa")).toBeTruthy();
  });

  it("uses a two-column layout for two images", () => {
    const { container } = render(
      <ResortGallery
        images={[{ media: { id: "m1", altText: "One" } }, { media: { id: "m2", altText: "Two" } }]}
      />,
    );
    const section = container.querySelector('[aria-label="Photos"]') as HTMLElement;
    expect(section.getAttribute("data-gallery-count")).toBe("2");
    expect(section.className).toMatch(/sm:grid-cols-2/);
  });

  it("keeps the featured multi-image grid for three or more", () => {
    const { container } = render(
      <ResortGallery
        images={[
          { media: { id: "m1", altText: "One" } },
          { media: { id: "m2", altText: "Two" } },
          { media: { id: "m3", altText: "Three" } },
        ]}
      />,
    );
    const section = container.querySelector('[aria-label="Photos"]') as HTMLElement;
    expect(section.getAttribute("data-gallery-count")).toBe("3");
    expect(section.className).toMatch(/sm:grid-cols-3/);
  });
});

describe("Phase 3 — Quick Search dialog focus", () => {
  it("moves focus into the dialog, traps it, closes on Escape, and restores the trigger", async () => {
    render(<QuickSearchDialog />);
    const trigger = screen.getByRole("button", { name: /Search site/i });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: /Quick Search/i });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    await vi.waitFor(() => {
      expect(document.activeElement?.getAttribute("type")).toBe("search");
    });
    fireEvent.keyDown(window, { key: "Escape" });
    await vi.waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Quick Search/i })).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});

describe("Phase 3 — login mode switcher semantics", () => {
  it("exposes pressed state for password and magic-link modes", () => {
    render(
      <LoginForm
        registerHref="/register"
        passwordSignInAction={async () => {}}
        requestMagicLinkAction={async () => {}}
      />,
    );
    const group = screen.getByRole("group", { name: /Sign-in method/i });
    const password = within(group).getByRole("button", { name: /Password/i });
    const magic = within(group).getByRole("button", { name: /Magic Link/i });
    expect(password.getAttribute("aria-pressed")).toBe("true");
    expect(magic.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(magic);
    expect(password.getAttribute("aria-pressed")).toBe("false");
    expect(magic.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Phase 3 — heading hierarchy", () => {
  it("avoids h1→h3 skips on /plan perk cards", async () => {
    vi.spyOn(authMod, "auth").mockResolvedValue(null);
    vi.spyOn(wishlistMod, "listSavedItems").mockResolvedValue([]);
    vi.spyOn(db, "$queryRaw").mockResolvedValue([] as never);
    vi.spyOn(enquiriesService, "plannerCatalog").mockResolvedValue({
      noticeVersion: "2026-10-10",
      draftTtlDays: 30,
      tripTypes: [],
      resorts: [],
      experiences: [],
    } as never);
    const view = await PlanPage();
    const { container } = render(view);
    const levels = [...container.querySelectorAll("h1,h2,h3,h4")].map((el) => el.tagName);
    expect(levels[0]).toBe("H1");
    expect(levels.includes("H3")).toBe(false);
  });

  it("avoids h3-before-h2 on /newsletter perk cards", async () => {
    vi.spyOn(discoveryMod, "listRecentPublishedGuides").mockResolvedValue([]);
    vi.spyOn(db.systemSetting, "findUnique").mockResolvedValue(null as never);
    const view = await NewsletterPage({ searchParams: Promise.resolve({}) });
    const { container } = render(view);
    const headings = [...container.querySelectorAll("h1,h2,h3")].map((el) => el.tagName);
    expect(headings[0]).toBe("H1");
    const firstH2 = headings.indexOf("H2");
    const firstH3 = headings.indexOf("H3");
    if (firstH3 !== -1) expect(firstH2).toBeGreaterThanOrEqual(0);
    if (firstH2 !== -1 && firstH3 !== -1) expect(firstH3).toBeGreaterThan(firstH2);
    expect(firstH3).toBe(-1);
  });
});

describe("Phase 3 — icon-only controls have names", () => {
  it("names the Quick Search trigger", () => {
    render(<QuickSearchDialog />);
    expect(screen.getByRole("button", { name: /Search site/i })).toBeTruthy();
  });
});

describe("Phase 3 — review list structure", () => {
  it("keeps review titles out of the heading outline and names resort links", async () => {
    const { ReviewList } = await import("@/components/reviews/review-list");
    const { container } = render(
      <ReviewList
        reviews={[
          {
            id: "r1",
            displayName: "Alex Traveler",
            body: "Calm lagoon.",
            rating: 5,
            ratingBasis: null,
            label: "Guest note",
            resortHref: "/resorts/example",
            resortName: "Example Resort",
          } as never,
        ]}
      />,
    );
    expect(container.querySelectorAll("h1,h2,h3,h4").length).toBe(0);
    expect(screen.getByRole("link", { name: "Example Resort" })).toBeTruthy();
  });
});
