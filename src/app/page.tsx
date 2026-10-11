import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/discovery/json-ld";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { siteOrigin } from "@/lib/seo/site";
import { websiteSearchData } from "@/lib/seo/structured";
import { listPublishedHomepageModules } from "@/modules/content";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Maldives Explorer",
    description: "Published places are listed on their own pages.",
    path: "/",
  }),
  title: { absolute: "Maldives Explorer" },
};

function moduleText(config: unknown): string {
  if (!config || typeof config !== "object" || Array.isArray(config) || !("text" in config))
    return "";
  return typeof config.text === "string" ? config.text.trim() : "";
}

export default async function HomePage() {
  let failed = false;
  let modules: Awaited<ReturnType<typeof listPublishedHomepageModules>> = [];
  try {
    modules = await listPublishedHomepageModules();
  } catch (error) {
    failed = true;
    logError(error instanceof Error ? error.message : "Homepage modules could not be loaded.");
  }
  return (
    <div className="grid gap-8">
      <JsonLd data={websiteSearchData(siteOrigin())} />
      <section className="grid max-w-[65ch] gap-4">
        <h1>Maldives Explorer</h1>
        <p>Published places are listed on their own pages.</p>
        <Link href="/plan" className="font-semibold text-lagoon-ink">
          Plan a trip
        </Link>
      </section>
      {failed ? (
        <ErrorState title="Homepage modules">
          <p>The homepage modules could not be loaded.</p>
        </ErrorState>
      ) : modules.length === 0 ? (
        <EmptyState title="Homepage">
          <p>No homepage module is published.</p>
        </EmptyState>
      ) : (
        modules.map((module) => {
          const text = moduleText(module.config);
          if (!text) {
            return (
              <EmptyState key={module.id} title={module.title ?? "Homepage module"}>
                <p>Nothing is selected for this module.</p>
              </EmptyState>
            );
          }
          return (
            <section key={module.id} className="grid max-w-[65ch] gap-4">
              <h2>{module.title ?? module.moduleType}</h2>
              <p>{text}</p>
            </section>
          );
        })
      )}
    </div>
  );
}
