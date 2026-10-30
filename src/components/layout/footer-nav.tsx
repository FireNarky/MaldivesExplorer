"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

type Column = {
  title: string;
  links: readonly { readonly href: string; readonly label: string }[];
};

export function FooterNav({ columns }: { columns: readonly Column[] }) {
  // On mobile, default to all collapsed for compactness, or first open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <nav aria-label="Footer" className="grid gap-3 sm:grid-cols-3 sm:gap-8 lg:col-span-7">
      {columns.map((column) => {
        const isOpen = openSections[column.title] ?? false;
        return (
          <div key={column.title} className="border-b border-white/15 pb-2 sm:border-none sm:pb-0">
            {/* Mobile collapsible header */}
            <button
              type="button"
              onClick={() => toggleSection(column.title)}
              aria-expanded={isOpen}
              className="flex min-h-[44px] w-full items-center justify-between text-left font-sans text-xs font-semibold uppercase tracking-wider text-white/90 sm:hidden"
            >
              <span>{column.title}</span>
              <ChevronDown
                size={18}
                className={`text-slate-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {/* Desktop static header */}
            <h2 className="hidden font-sans text-xs font-semibold uppercase tracking-wider text-white/90 sm:block sm:text-sm sm:mb-3">
              {column.title}
            </h2>

            {/* Link list */}
            <ul className={`grid gap-1 ${isOpen ? "grid pb-3 pt-1" : "hidden sm:grid"}`}>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-sm text-slate-200 underline-offset-4 transition-colors hover:text-white hover:underline sm:text-base"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
