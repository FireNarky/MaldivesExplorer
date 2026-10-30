import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import ContactPage from "@/app/contact/page";
import CollectionsPage from "@/app/collections/page";
import DestinationsPage from "@/app/destinations/page";
import MapPage from "@/app/map/page";
import ContactSettingsAdminPage from "@/app/admin/settings/contact/page";
import { GET as getInternalRedirect } from "@/app/api/internal/redirects/route";
import { FloatingChatWidget } from "@/components/chat/floating-chat-widget";
import { PaletteSwitcher } from "@/components/layout/palette-switcher";
import { Archipelago3DMap, RESORTS_DATA } from "@/components/map/archipelago-3d-map";
import { DestinationCard } from "@/components/patterns/destination-card";
import * as authMod from "@/auth";
import { db } from "@/lib/db";
import { DEFAULT_CONTACT_SETTINGS } from "@/modules/contact/types";
import * as discoveryMod from "@/modules/discovery";
import * as identityMod from "@/modules/identity/service";
import * as redirectsMod from "@/modules/redirects/service";
import { resolveRepoRoot } from "../../scripts/lib/dev-runtime";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Takeover F-TAKEOVER-01 — D-003 SLA governance & ContactForm WhatsApp channel gating", () => {
  it("keeps ContactForm free of unapproved 2-business-hour public SLA promises", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/contact/contact-form.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/2 business hours/i);
    expect(source).not.toMatch(/within 4 hours/i);
  });

  it("hides the WhatsApp link in ContactForm on /contact when whatsappEnabled is false even if a phone number is stored", async () => {
    vi.spyOn(db.systemSetting, "findUnique").mockResolvedValue({
      key: "contact_settings",
      value: {
        ...DEFAULT_CONTACT_SETTINGS,
        whatsappEnabled: false,
        whatsappNumber: "+960 700 9999",
      },
      updatedAt: new Date(),
      updatedById: null,
    } as never);

    const view = await ContactPage();
    const { container } = render(view);
    expect(container.textContent).not.toContain("Message on WhatsApp");
    expect(container.innerHTML).not.toContain("7009999");
  });

  it("shows the WhatsApp link in ContactForm on /contact when whatsappEnabled is true and a number is configured", async () => {
    vi.spyOn(db.systemSetting, "findUnique").mockResolvedValue({
      key: "contact_settings",
      value: {
        ...DEFAULT_CONTACT_SETTINGS,
        whatsappEnabled: true,
        whatsappNumber: "+960 700 9999",
      },
      updatedAt: new Date(),
      updatedById: null,
    } as never);

    const view = await ContactPage();
    const { container } = render(view);
    expect(container.textContent).toContain("Message on WhatsApp");
    expect(container.innerHTML).toContain("https://wa.me/9607009999");
  });
});

describe("Takeover F-TAKEOVER-02 — D-013 transfer integrity & MapWithList accessibility", () => {
  it("removes hardcoded unverified transfer durations from RESORTS_DATA, DestinationCard, and /destinations", async () => {
    for (const resort of RESORTS_DATA) {
      expect(resort.transferSummary).toBeNull();
    }

    const { container: cardContainer } = render(
      <DestinationCard
        item={{
          id: "a1",
          name: "Baa Atoll",
          slug: "baa-atoll",
          summary: "UNESCO Biosphere Reserve.",
          resortCount: 2,
          islandCount: 2,
        }}
      />,
    );
    expect(cardContainer.textContent).not.toMatch(/\b30m Seaplane\b/i);
    expect(cardContainer.textContent).toContain("2 Resorts");

    vi.spyOn(db.atoll, "findMany").mockResolvedValue([
      {
        id: "a1",
        name: "Baa Atoll",
        slug: "baa-atoll",
        summary: "UNESCO Biosphere Reserve.",
        latitude: null,
        longitude: null,
        islands: [{ id: "i1", resorts: [{ name: "Soneva Fushi", slug: "soneva-fushi" }] }],
      },
    ] as never);

    const destView = await DestinationsPage({ searchParams: Promise.resolve({}) });
    const { container: destContainer } = render(destView);
    expect(destContainer.textContent).not.toContain("35m");
    expect(destContainer.textContent).not.toContain("Avg Seaplane");
    expect(destContainer.textContent).toContain("Published Atolls");
  });

  it("provides accessible names on all Archipelago3DMap controls and avoids fabricated transfer durations", () => {
    render(<Archipelago3DMap initialResortSlug="soneva-jani" />);

    expect(
      screen.getByRole("button", { name: /Switch to flat 2D view|Switch to 3D perspective tilt/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", {
        name: /Switch to bathymetric ocean chart|Switch to photorealistic satellite/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset archipelago overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close resort inspector" })).toBeInTheDocument();
    expect(screen.getByText("Transfer details on request")).toBeInTheDocument();
  });

  it("renders the accessible MapWithList directory on /map from published database records", async () => {
    vi.spyOn(db.resort, "findMany").mockResolvedValue([
      {
        id: "r1",
        name: "Soneva Jani",
        slug: "soneva-jani",
        summary: "Overwater lagoon sanctuary.",
        editorialPositioning: "Lagoon Villas",
        island: {
          name: "Medhufaru",
          status: "PUBLISHED",
          latitude: 5.9221,
          longitude: 73.2842,
          atoll: {
            name: "Noonu Atoll",
            slug: "noonu-atoll",
            status: "PUBLISHED",
            latitude: 5.8833,
            longitude: 73.25,
          },
        },
        transfers: [],
      },
    ] as never);
    vi.spyOn(db.atoll, "findMany").mockResolvedValue([
      {
        id: "a1",
        name: "Noonu Atoll",
        slug: "noonu-atoll",
        summary: "Northern atoll lagoons.",
      },
    ] as never);

    const view = await MapPage({ searchParams: Promise.resolve({}) });
    const { container } = render(view);

    expect(
      screen.getByRole("heading", { level: 2, name: "Published Archipelago Directory" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Soneva Jani" })).toHaveAttribute(
      "href",
      "/resorts/soneva-jani",
    );
    expect(screen.getByRole("link", { name: "Noonu Atoll" })).toHaveAttribute(
      "href",
      "/atolls/noonu-atoll",
    );
    expect(container.textContent).not.toMatch(/30–45 minute scenic flights/i);
    expect(container.textContent).not.toMatch(/20–45 minute private speedboat/i);
  });
});

describe("Takeover F-TAKEOVER-03 & F-TAKEOVER-04 — Cross-platform repo root & LF normalization", () => {
  it("resolves synthetic POSIX file URLs cleanly on both Windows and POSIX", () => {
    const synthetic = resolveRepoRoot("file:///opt/ci/repo/scripts/lib/dev-runtime.ts");
    expect(synthetic).toBe(path.resolve("/opt/ci/repo"));
  });

  it("maintains .gitattributes with LF line-ending normalization", () => {
    const gitattributes = readFileSync(path.join(process.cwd(), ".gitattributes"), "utf8");
    expect(gitattributes).toContain("* text=auto eol=lf");
  });
});

describe("Takeover F-TAKEOVER-05 — 44px touch targets & accessible labels on interactive controls", () => {
  it("uses 44px (size-11) close buttons on PaletteSwitcher and FloatingChatWidget", () => {
    render(<PaletteSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /Ocean & Coral Theme/i }));
    const closePalette = screen.getByRole("button", { name: "Close palette selector" });
    expect(closePalette.className).toContain("size-11");
    fireEvent.click(closePalette);

    render(
      <FloatingChatWidget
        settings={{
          ...DEFAULT_CONTACT_SETTINGS,
          whatsappEnabled: true,
          whatsappNumber: "+960 700 1111",
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Chat with island concierge/i }));
    const closeChat = screen.getByRole("button", { name: "Close concierge chat" });
    expect(closeChat.className).toContain("size-11");
  });

  it("labels the back link on /admin/settings/contact with aria-label and size-11", async () => {
    vi.spyOn(authMod, "auth").mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com", staff: true },
    } as never);
    vi.spyOn(identityMod, "userHasPermission").mockResolvedValue(true);
    vi.spyOn(db.systemSetting, "findUnique").mockResolvedValue(null);

    const view = await ContactSettingsAdminPage();
    render(view);
    const backLink = screen.getByRole("link", { name: "Back to staff dashboard" });
    expect(backLink).toHaveAttribute("href", "/admin");
    expect(backLink.className).toContain("size-11");
  });
});

describe("Takeover F-TAKEOVER-06 — Internal redirect resilience & published collection counts", () => {
  it("returns 204 No Content instead of throwing 500 when the database is unavailable during redirect lookup", async () => {
    vi.spyOn(redirectsMod, "findActiveRedirect").mockRejectedValue(new Error("DB offline"));
    const res = await getInternalRedirect(
      new Request("http://127.0.0.1:3000/api/internal/redirects?path=/legacy"),
    );
    expect(res.status).toBe(204);
  });

  it("counts only published non-fixture collection items on /collections", async () => {
    vi.spyOn(db.collection, "findMany").mockResolvedValue([
      {
        id: "col-1",
        title: "Overwater Icons",
        slug: "overwater-icons",
        summary: "Curated overwater sanctuaries.",
      },
    ] as never);
    vi.spyOn(discoveryMod, "listPublishedCollectionItems").mockResolvedValue([
      { id: "r1", name: "Soneva Jani", href: "/resorts/soneva-jani", summary: "Summary" },
    ]);

    const view = await CollectionsPage();
    const { container } = render(view);
    expect(container.textContent).toContain("1 curated item");
  });
});
