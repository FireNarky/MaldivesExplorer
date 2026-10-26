"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  ChevronRight,
  Compass,
  HelpCircle,
  MapPin,
  Menu,
  Moon,
  Palmtree,
  Sailboat,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Tag,
  User,
  MessageSquare,
  X,
} from "lucide-react";
import { trapFocusKeydown } from "@/lib/a11y/focus-trap";

type MenuLink = { href: string; label: string };

type RouteMeta = {
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  subtitle: string;
  section: "explore" | "journey" | "account";
};

const ROUTE_META: Record<string, RouteMeta> = {
  "/destinations": {
    icon: MapPin,
    subtitle: "26 natural geographic atolls",
    section: "explore",
  },
  "/resorts": {
    icon: Palmtree,
    subtitle: "Private islands & overwater pool villas",
    section: "explore",
  },
  "/experiences": {
    icon: Sailboat,
    subtitle: "Manta safaris, dining & marine adventures",
    section: "explore",
  },
  "/offers": {
    icon: Tag,
    subtitle: "Direct partner privileges & exclusive stays",
    section: "explore",
  },
  "/guides": {
    icon: BookOpen,
    subtitle: "Maldivian field notes & travel intelligence",
    section: "explore",
  },
  "/contact": {
    icon: MessageSquare,
    subtitle: "Resident concierge & WhatsApp advisory",
    section: "explore",
  },
  "/wishlist": {
    icon: Bookmark,
    subtitle: "Your saved private island shortlist",
    section: "journey",
  },
  "/compare": {
    icon: SlidersHorizontal,
    subtitle: "Side-by-side island comparisons",
    section: "journey",
  },
  "/faq": {
    icon: HelpCircle,
    subtitle: "Transfers, seasons & practical FAQs",
    section: "journey",
  },
  "/login": {
    icon: User,
    subtitle: "Sign in to access your sanctuary",
    section: "account",
  },
  "/account": {
    icon: User,
    subtitle: "Manage quotes & travel preferences",
    section: "account",
  },
  "/admin": {
    icon: ShieldCheck,
    subtitle: "Staff & curation workspace",
    section: "account",
  },
};

export function MobileMenu({ links, account }: { links: MenuLink[]; account: MenuLink[] }) {
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, [open]);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      try {
        localStorage.setItem("mdv-mode", "dark");
      } catch {}
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.removeAttribute("data-theme");
      try {
        localStorage.setItem("mdv-mode", "light");
      } catch {}
    }
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = document.getElementById("mobile-menu");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (panel) trapFocusKeydown(event, panel);
    };
    document.addEventListener("keydown", onKey);
    const first = panel?.querySelector<HTMLElement>(
      'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const exploreLinks = links.filter((l) => (ROUTE_META[l.href]?.section ?? "explore") === "explore");
  const journeyLinks = account.filter((l) => ROUTE_META[l.href]?.section === "journey");
  const accountLinks = account.filter((l) => (ROUTE_META[l.href]?.section ?? "account") === "account");

  const renderMenuItem = (link: MenuLink) => {
    const meta = ROUTE_META[link.href] ?? {
      icon: Compass,
      subtitle: "",
      section: "explore" as const,
    };
    const Icon = meta.icon;
    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={isActive ? "page" : undefined}
        onClick={() => setOpen(false)}
        className="group flex min-h-[52px] items-center gap-3.5 rounded-2xl p-2.5 transition-all hover:bg-mist/80 dark:hover:bg-white/10 active:scale-[0.99] aria-[current=page]:bg-mist dark:aria-[current=page]:bg-white/10"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-ocean dark:text-cyan-300 group-hover:bg-ocean group-hover:text-white dark:group-hover:bg-cyan-400 dark:group-hover:text-ocean transition-colors shadow-sm">
          <Icon size={18} aria-hidden="true" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-ocean dark:text-cyan-200 group-hover:text-ocean dark:group-hover:text-cyan-100">
            {link.label}
          </span>
          {meta.subtitle ? (
            <span className="text-xs text-muted dark:text-slate-400 truncate">
              {meta.subtitle}
            </span>
          ) : null}
        </div>
        <ChevronRight
          size={16}
          className="ml-auto shrink-0 text-muted/50 group-hover:text-ocean dark:group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all"
          aria-hidden="true"
        />
      </Link>
    );
  };

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-xl border border-border-subtle bg-white dark:bg-white/10 dark:border-white/15 text-ink dark:text-white active:scale-95 transition-transform shadow-sm"
      >
        {open ? (
          <X aria-hidden="true" size={20} strokeWidth={1.75} />
        ) : (
          <Menu aria-hidden="true" size={20} strokeWidth={1.75} />
        )}
      </button>
      {open ? (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-20 border-b border-border-subtle bg-white/95 dark:bg-[#071318]/95 backdrop-blur-xl shadow-3 animate-in fade-in slide-in-from-top-1 max-h-[calc(100vh-4.5rem)] overflow-y-auto overscroll-contain"
        >
          <nav aria-label="Mobile" className="mx-auto grid w-full max-w-[90rem] gap-4 px-4 py-4 sm:px-6">
            {/* Primary Action Button */}
            <Link
              href="/plan"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-center gap-2.5 rounded-2xl bg-coral px-5 text-base font-semibold text-[#111827] shadow-sm active:scale-[0.99] transition-transform"
            >
              <Compass aria-hidden="true" size={20} strokeWidth={2} />
              Plan my trip
            </Link>

            {/* Section 1: Explore Sanctuaries */}
            <div className="space-y-1">
              <p className="px-3 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted dark:text-slate-400">
                Explore Sanctuaries
              </p>
              <div className="grid gap-1">
                {exploreLinks.map(renderMenuItem)}
              </div>
            </div>

            {/* Section 2: Personal Journey */}
            {journeyLinks.length > 0 ? (
              <div className="space-y-1 border-t border-border-subtle/80 dark:border-white/10 pt-3">
                <p className="px-3 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted dark:text-slate-400">
                  Your Journey
                </p>
                <div className="grid gap-1">
                  {journeyLinks.map(renderMenuItem)}
                </div>
              </div>
            ) : null}

            {/* Section 3: Membership */}
            {accountLinks.length > 0 ? (
              <div className="space-y-1 border-t border-border-subtle/80 dark:border-white/10 pt-3">
                <p className="px-3 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted dark:text-slate-400">
                  Membership &amp; Access
                </p>
                <div className="grid gap-1">
                  {accountLinks.map(renderMenuItem)}
                </div>
              </div>
            ) : null}

            {/* Section 4: Theme Mode Switcher */}
            <div className="border-t border-border-subtle dark:border-white/10 pt-3">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex min-h-[48px] w-full items-center justify-between rounded-2xl px-3.5 text-sm font-semibold text-ocean dark:text-cyan-300 hover:bg-mist dark:hover:bg-white/10 transition-colors"
              >
                <span>Theme Appearance</span>
                <span className="flex items-center gap-1.5 text-xs text-muted dark:text-slate-300 bg-sand dark:bg-white/10 px-3 py-1.5 rounded-full border border-border-subtle/50">
                  {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
                  {isDark ? "Dark Mode" : "Light Mode"}
                </span>
              </button>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
