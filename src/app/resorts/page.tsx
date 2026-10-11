import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { logError } from "@/lib/observability/log";
import { listPublishedResorts } from "@/modules/catalog";

export const metadata: Metadata = {
  title: "Resorts",
  robots: { index: false, follow: false },
};

export default async function ResortsPage() {
  try {
    const resorts = await listPublishedResorts();
    if (resorts.length === 0) {
      return (
        <EmptyState title="Resorts">
          <p>No resort is published.</p>
        </EmptyState>
      );
    }
    return (
      <section className="grid gap-6">
        <h1>Resorts</h1>
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
      <ErrorState title="Resorts">
        <p>Published resorts could not be loaded.</p>
      </ErrorState>
    );
  }
}
