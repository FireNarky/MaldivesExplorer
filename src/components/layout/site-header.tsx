import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-sand">
      <div className="mx-auto flex min-h-16 w-full max-w-[90rem] items-center px-4 lg:px-8">
        <Link href="/" className="font-display text-xl text-ocean">
          Maldives Explorer
        </Link>
      </div>
    </header>
  );
}
