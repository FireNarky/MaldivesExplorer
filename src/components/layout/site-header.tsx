import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth().catch(() => null);
  const signedIn = Boolean(session?.user?.id);
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-sand">
      <div className="mx-auto flex min-h-16 w-full max-w-[90rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-8">
        <Link href="/" className="font-display text-xl text-ocean">
          Maldives Explorer
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/destinations" className="text-base font-semibold text-lagoon-ink">
            Destinations
          </Link>
          <Link href="/experiences" className="text-base font-semibold text-lagoon-ink">
            Experiences
          </Link>
          <Link href="/guides" className="text-base font-semibold text-lagoon-ink">
            Guides
          </Link>
          <Link href="/resorts" className="text-base font-semibold text-lagoon-ink">
            Resorts
          </Link>
          <Link href="/wishlist" className="text-base font-semibold text-lagoon-ink">
            Saved
          </Link>
          <Link href="/plan" className="text-base font-semibold text-lagoon-ink">
            Plan a trip
          </Link>
          <Link href="/search" className="text-base font-semibold text-lagoon-ink">
            Search
          </Link>
        </nav>
        <nav aria-label="Account" className="ml-auto flex items-center gap-3">
          {session?.user?.staff ? (
            <Link href="/admin" className="text-base font-semibold text-lagoon-ink">
              Staff
            </Link>
          ) : null}
          {signedIn ? (
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
          ) : (
            <Link href="/login" className="text-base font-semibold text-lagoon-ink">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
