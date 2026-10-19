import Link from "next/link";
import { Compass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionBar() {
  return (
    <div
      aria-label="Quick actions"
      role="region"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border-subtle bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid h-16 grid-cols-2 items-center gap-3 px-4">
        <Button asChild variant="secondary">
          <Link href="/search">
            <Search aria-hidden="true" size={20} strokeWidth={1.75} />
            Search
          </Link>
        </Button>
        <Button asChild variant="conversion">
          <Link href="/plan">
            <Compass aria-hidden="true" size={20} strokeWidth={1.75} />
            Plan my trip
          </Link>
        </Button>
      </div>
    </div>
  );
}
