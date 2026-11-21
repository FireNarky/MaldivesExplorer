import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { Archipelago3DMap } from "@/components/map/archipelago-3d-map";
import { publicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicMetadata({
  title: "Star Chart · Fly a Seaplane to Your Island",
  description:
    "Explore 26 natural geographic atolls, luxury private island sanctuaries, and seaplane transfer corridors in an interactive 3D perspective.",
  path: "/map",
});

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ resort?: string }>;
}) {
  const { resort } = await searchParams;

  return (
    <div className="space-y-5 py-2 sm:py-6 animate-in fade-in duration-300">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Star Chart" }]} />

      {/* Clean Minimal Page Header */}
      <div className="space-y-2 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-ocean dark:text-[#c5ebe7]">
          Follow your star to the island
        </h1>
        <p className="text-sm sm:text-base text-muted dark:text-slate-300 font-light leading-relaxed">
          Tap a resort and watch the seaplane fly you there from Malé.
        </p>
      </div>

      {/* 3D Map Component */}
      <section aria-label="Star Chart island explorer" className="w-full">
        <Archipelago3DMap initialResortSlug={resort} />
      </section>

    </div>
  );
}
