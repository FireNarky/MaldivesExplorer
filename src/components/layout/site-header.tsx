import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth().catch(() => null);
  const signedIn = Boolean(session?.user?.id);
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-sand">
      <div className="mx-auto flex min-h-16 w-full max-w-[90rem] items-center justify-between gap-4 px-4 lg:px-8">
        <Link href="/" className="font-display text-xl text-ocean">
          Maldives Explorer
        </Link>
        <nav aria-label="Account" className="flex items-center gap-3">
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
