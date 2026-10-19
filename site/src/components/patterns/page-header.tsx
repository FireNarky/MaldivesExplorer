import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import type { Crumb } from "@/lib/seo/structured";

export function PageHeader({
  crumbs,
  title,
  lede,
  actions,
}: {
  crumbs: Crumb[];
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid gap-4 border-b border-border-subtle pb-8">
      <Breadcrumbs items={crumbs} />
      <h1 className="max-w-[24ch]">{title}</h1>
      {lede ? <p className="max-w-[65ch] text-lg text-ink">{lede}</p> : null}
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
