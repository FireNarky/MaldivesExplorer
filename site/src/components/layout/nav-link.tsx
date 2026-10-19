"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center border-b-2 border-transparent text-base font-semibold text-ocean hover:border-border-subtle",
        current && "border-lagoon-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}
