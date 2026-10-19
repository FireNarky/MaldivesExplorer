import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { LocalRecent } from "@/components/shortlist/local-recent";
import { publicMetadata } from "@/lib/seo/metadata";
import { shortlistLimits } from "@/modules/wishlist/service";

export const metadata: Metadata = publicMetadata({
  title: "Recently viewed",
  description: "Listings viewed on this device.",
  path: "/recently-viewed",
});

export default async function RecentlyViewedPage() {
  const limits = await shortlistLimits();
  return (
    <section className="grid gap-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Recently viewed" }]} />
      <h1>Recently viewed</h1>
      <LocalRecent limit={limits.recent} />
    </section>
  );
}
