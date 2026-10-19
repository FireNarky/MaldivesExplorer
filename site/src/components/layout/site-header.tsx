import Link from "next/link";
import { Compass } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLink } from "@/components/layout/nav-link";
import { primaryLinks, utilityLinks } from "@/components/layout/nav-links";

import { QuickSearchDialog } from "@/components/layout/quick-search-dialog";

export async function SiteHeader() {
  const session = await auth().catch(() => null);
  const signedIn = Boolean(session?.user?.id);
  const account = [
    { href: "/board", label: "Team Board" },
    ...utilityLinks,
    ...(signedIn
      ? [{ href: "/account", label: "Account" }]
      : [{ href: "/login", label: "Sign in" }]),
    ...(session?.user?.staff ? [{ href: "/admin", label: "Staff" }] : []),
  ];
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-sand/95 backdrop-blur">
      <div className="relative mx-auto flex min-h-16 w-full max-w-[90rem] items-center gap-2 sm:gap-4 px-4 lg:gap-8 lg:px-8">
        <Link href="/" className="flex shrink-0 items-baseline gap-2 py-2 font-display text-lg sm:text-xl text-ocean">
          <span aria-hidden="true" className="size-2.5 sm:size-3 rounded-full bg-lagoon" />
          Maldives Explorer
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {primaryLinks.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <nav aria-label="Account" className="ml-auto flex items-center gap-2">
          <QuickSearchDialog />
          <div className="hidden items-center gap-2 lg:flex">
            <NavLink href="/board" className="px-2 font-medium text-ocean hover:text-coral">
              Team Board
            </NavLink>
            {utilityLinks.slice(0, 1).map((link) => (
              <NavLink key={link.href} href={link.href} className="px-2">
                {link.label}
              </NavLink>
            ))}
            {session?.user?.staff ? (
              <NavLink href="/admin" className="px-2">
                Staff
              </NavLink>
            ) : null}
            {signedIn ? (
              <>
                <NavLink href="/account" className="px-2">
                  Account
                </NavLink>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <Button type="submit" variant="tertiary">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <NavLink href="/login" className="px-2">
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
          <MobileMenu links={[...primaryLinks]} account={account} />
        </nav>
      </div>
    </header>
  );
}
