import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="surface-inverse bg-ocean text-sand">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-8 lg:px-8">
        <p className="font-display text-xl text-sand">Maldives Explorer</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/destinations" className="text-base text-sand">
            Destinations
          </Link>
          <Link href="/experiences" className="text-base text-sand">
            Experiences
          </Link>
          <Link href="/guides" className="text-base text-sand">
            Guides
          </Link>
          <Link href="/collections" className="text-base text-sand">
            Collections
          </Link>
          <Link href="/faq" className="text-base text-sand">
            Questions
          </Link>
          <Link href="/search" className="text-base text-sand">
            Search
          </Link>
          <Link href="/wishlist" className="text-base text-sand">
            Saved
          </Link>
          <Link href="/compare" className="text-base text-sand">
            Compare
          </Link>
          <Link href="/recently-viewed" className="text-base text-sand">
            Recently viewed
          </Link>
        </nav>
      </div>
    </footer>
  );
}
