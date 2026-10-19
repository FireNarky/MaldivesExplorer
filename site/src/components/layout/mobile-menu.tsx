"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, X } from "lucide-react";

type MenuLink = { href: string; label: string };

export function MobileMenu({ links, account }: { links: MenuLink[]; account: MenuLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-white text-ink active:scale-95 transition-transform"
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
          className="absolute inset-x-0 top-full z-20 border-b border-border-subtle bg-white shadow-3 animate-in fade-in slide-in-from-top-1"
        >
          <nav aria-label="Mobile" className="mx-auto grid w-full max-w-[90rem] gap-2 px-4 py-4">
            <Link
              href="/plan"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral px-4 text-base font-semibold text-white shadow-sm active:opacity-90"
            >
              <Compass aria-hidden="true" size={20} strokeWidth={2} />
              Plan my trip
            </Link>
            <div className="grid gap-1 pt-1">
              {[...links, ...account].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                  className="flex min-h-11 items-center rounded-lg px-3 text-base font-semibold text-ocean transition-colors hover:bg-mist aria-[current=page]:bg-mist aria-[current=page]:font-bold"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
