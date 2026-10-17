import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { listPublishedResorts } from "@/modules/catalog";

export const metadata: Metadata = publicMetadata({
  title: "Resorts",
  description: "Published resorts.",
  path: "/resorts",
});

export default async function ResortsPage() {
  try {
    const resorts = await listPublishedResorts();
    return (
      <section className="grid gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Resorts" }]} />
        <h1>Resorts</h1>
        {resorts.length === 0 ? <p>No resort is published.</p> : null}
        <ul className="grid gap-4">
          {resorts.map((resort) => (
            <li key={resort.id} className="grid max-w-[65ch] gap-2">
              <h2>
                <Link href={`/resorts/${resort.slug}`} className="text-lagoon-ink">
                  {resort.name}
                </Link>
              </h2>
              <p>{resort.summary}</p>
              {resort.island.status === "PUBLISHED" ? (
                <p>
                  {resort.island.name}
                  {resort.island.atoll.status === "PUBLISHED"
                    ? `, ${resort.island.atoll.name}`
                    : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Published resorts could not be loaded.");
    return (
      <section className="grid gap-6">
        <h1>Resorts</h1>
        <ErrorState title="Resorts">
          <p>Published resorts could not be loaded.</p>
        </ErrorState>
      </section>
    );
  }
}
