import type { Metadata } from "next";
import Link from "next/link";
import { FolderHeart, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { db } from "@/lib/db";

export const metadata: Metadata = publicMetadata({
  title: "Curated Maldives Collections",
  description: "Hand-picked themes: iconic overwater villas, UNESCO biosphere sanctuaries, romantic sandbanks, and family island retreats.",
  path: "/collections",
});

export default async function CollectionsPage() {
  try {
    const collections = await db.collection.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { title: "asc" },
      include: {
        items: true,
      },
    });

    return (
      <div className="grid gap-10">
        <PageHeader
          crumbs={[{ name: "Home", href: "/" }, { name: "Collections" }]}
          title="Curated Collections"
          lede="Thematic groupings curated by our Maldives specialists, grouping the archipelago's finest properties by architectural style, marine biology, and honeymoon intimacy."
        />

        {collections.length === 0 ? (
          <EmptyState title="Collections">
            <p>No collections are published yet.</p>
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {collections.map((col) => (
              <article
                key={col.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border-subtle bg-white p-6 lg:p-8 shadow-1 transition-all duration-200 hover:-translate-y-1 hover:border-ocean/40 hover:shadow-2"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-mist text-lagoon-ink">
                      <Sparkles size={20} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold text-muted bg-sand px-3 py-1 rounded-full">
                      {col.items.length} curated {col.items.length === 1 ? "resort" : "resorts"}
                    </span>
                  </div>

                  <h2 className="mb-3 font-display text-2xl text-ocean">
                    <Link href={`/collections/${col.slug}`} className="after:absolute after:inset-0 hover:underline">
                      {col.title}
                    </Link>
                  </h2>

                  <p className="text-sm text-ink leading-relaxed mb-6">{col.summary}</p>
                </div>

                <div className="flex items-center justify-between border-t border-border-subtle/80 pt-4 text-sm font-semibold text-lagoon-ink group-hover:text-ocean">
                  <span>View Curated Collection &rarr;</span>
                  <FolderHeart size={16} aria-hidden="true" />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Collections could not be loaded.");
    return (
      <ErrorState title="Collections">
        <p>Collections could not be loaded.</p>
      </ErrorState>
    );
  }
}
