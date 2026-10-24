import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionBar() {
  return (
    <div
      aria-label="Quick actions"
      role="region"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border-subtle bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex h-16 items-center px-4">
        <Button asChild variant="conversion" className="w-full h-12 text-base font-semibold shadow-md active:scale-[0.99] transition-transform">
          <Link href="/plan" className="flex items-center justify-center gap-2">
            <Compass aria-hidden="true" size={20} strokeWidth={2} />
            <span>Plan my trip</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
