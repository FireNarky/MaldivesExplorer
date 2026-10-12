import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { noteConsentEvent } from "@/modules/analytics/service";
import { compareTable, loadCompareColumns } from "@/modules/compare/service";

type PageProps = { searchParams: Promise<{ ids?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const ids = params.ids ?? "";
  return publicMetadata({
    title: "Compare",
    description: "Compare published resorts.",
    path: ids.length > 0 ? `/compare?ids=${encodeURIComponent(ids)}` : "/compare",
  });
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const ids = (params.ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  try {
    const columns = await loadCompareColumns(ids);
    if (columns.length >= 2) await noteConsentEvent("comparison_started", { count: columns.length });
    if (columns.length === 0) {
      return (
        <section className="grid gap-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Compare" }]} />
          <h1>Compare</h1>
          <EmptyState title="Resorts">
            <p>Choose up to 3 published resorts.</p>
            <Link href="/resorts" className="text-lagoon-ink">
              Resorts
            </Link>
          </EmptyState>
        </section>
      );
    }
    const rows = compareTable(columns);
    return (
      <section className="grid gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Compare" }]} />
        <h1>Compare</h1>
        <p>Compare holds 3 resorts.</p>
        <div className="grid gap-6 lg:hidden">
          {columns.map((column) => (
            <article key={column.id} className="grid gap-3">
              <h2>
                {column.href ? (
                  <Link href={column.href} className="text-lagoon-ink">
                    {column.name}
                  </Link>
                ) : (
                  column.name
                )}
              </h2>
              <dl className="grid gap-3">
                {rows.map((row) => (
                  <div key={row.attribute} className="grid gap-1">
                    <dt className="font-semibold">{row.attribute}</dt>
                    <dd>{row.values[columns.indexOf(column)]}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-base">
            <caption className="sr-only">Published resort comparison</caption>
            <thead>
              <tr>
                <th scope="col" className="border border-border-subtle p-3 text-left">
                  Attribute
                </th>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className="border border-border-subtle p-3 text-left"
                  >
                    {column.href ? (
                      <Link href={column.href} className="text-lagoon-ink">
                        {column.name}
                      </Link>
                    ) : (
                      column.name
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.attribute}>
                  <th scope="row" className="border border-border-subtle p-3 text-left">
                    {row.attribute}
                  </th>
                  {row.values.map((value, index) => (
                    <td
                      key={`${row.attribute}-${columns[index]?.id ?? index}`}
                      className="border border-border-subtle p-3"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "The comparison could not be loaded.");
    return (
      <ErrorState title="Compare">
        <p>The comparison could not be loaded.</p>
      </ErrorState>
    );
  }
}
