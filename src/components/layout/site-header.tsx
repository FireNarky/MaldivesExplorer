import Link from "next/link";
import {
  Bookmark,
  BookOpen,
  Compass,
  LogOut,
  MapPin,
  Palmtree,
  Sailboat,
  ShieldCheck,
  Tag,
  User,
} from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { primaryLinks, utilityLinks } from "@/components/layout/nav-links";

import { QuickSearchDialog } from "@/components/layout/quick-search-dialog";

const PRIMARY_NAV_ICONS: Record<
  string,
  React.ComponentType<{
    size?: number;
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>
> = {
  "/destinations": MapPin,
  "/map": Compass,
  "/resorts": Palmtree,
  "/experiences": Sailboat,
  "/offers": Tag,
  "/guides": BookOpen,
};

export async function SiteHeader() {
  const session = await auth().catch(() => null);
  const signedIn = Boolean(session?.user?.id);
  const account = [
    ...utilityLinks,
    ...(signedIn
      ? [{ href: "/account", label: "Account" }]
      : [{ href: "/login", label: "Sign in" }]),
    ...(session?.user?.staff ? [{ href: "/admin", label: "Staff" }] : []),
  ];
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-sand/95 backdrop-blur">
      <div className="relative mx-auto flex min-h-16 w-full max-w-[90rem] 2xl:max-w-[105rem] 3xl:max-w-[115rem] items-center gap-2 sm:gap-4 px-4 lg:gap-8 lg:px-8 2xl:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2 py-2 font-display text-lg sm:text-xl text-ocean"
        >
          <span aria-hidden="true" className="size-2.5 sm:size-3 rounded-full bg-lagoon" />
          Maldives Explorer
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-5 xl:gap-7 lg:flex">
          {primaryLinks.map((link) => {
            const Icon = PRIMARY_NAV_ICONS[link.href];
            return (
              <NavLink
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 group transition-colors"
              >
                {Icon ? (
                  <Icon
                    size={16}
                    className="text-lagoon-ink/70 group-hover:text-lagoon-ink dark:text-cyan-400/70 dark:group-hover:text-cyan-300 transition-colors"
                    aria-hidden="true"
                  />
                ) : null}
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <nav aria-label="Account" className="ml-auto flex items-center gap-2">
          <QuickSearchDialog />
          <div className="hidden items-center gap-2 lg:flex">
            {utilityLinks.slice(0, 1).map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                className="px-2.5 inline-flex items-center gap-1.5"
              >
                <Bookmark size={15} aria-hidden="true" />
                {link.label}
              </NavLink>
            ))}
            {session?.user?.staff ? (
              <NavLink href="/admin" className="px-2.5 inline-flex items-center gap-1.5">
                <ShieldCheck size={15} aria-hidden="true" />
                Staff
              </NavLink>
            ) : null}
            {signedIn ? (
              <>
                <NavLink href="/account" className="px-2.5 inline-flex items-center gap-1.5">
                  <User size={15} aria-hidden="true" />
                  Account
                </NavLink>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <Button
                    type="submit"
                    variant="tertiary"
                    className="inline-flex items-center gap-1.5"
                  >
                    <LogOut size={15} aria-hidden="true" />
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <NavLink href="/login" className="px-2.5 inline-flex items-center gap-1.5">
                <User size={15} aria-hidden="true" />
                Sign in
              </NavLink>
            )}
            <Button asChild variant="conversion">
              <Link href="/plan">
                <Compass aria-hidden="true" size={20} strokeWidth={1.75} />
                Plan my trip
              </Link>
            </Button>
          </div>
          <Link
            href="/wishlist"
            aria-label="Saved list"
            className="lg:hidden inline-flex size-11 items-center justify-center rounded-xl border border-border-subtle bg-white dark:bg-white/10 dark:border-white/15 text-ink dark:text-white active:scale-95 transition-transform shadow-sm"
          >
            <Bookmark aria-hidden="true" size={19} strokeWidth={1.75} />
          </Link>
          <MobileMenu
            links={[...primaryLinks, { href: "/contact", label: "Contact & Concierge" }]}
            account={account}
          />
        </nav>
      </div>
    </header>
  );
}
