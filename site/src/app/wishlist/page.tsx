import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { LocalWishlist } from "@/components/shortlist/local-wishlist";
import { SavedAccountList } from "@/components/account/saved-list";
import { auth } from "@/auth";
import { publicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicMetadata({
  title: "Saved",
  description: "Saved resorts, offers, experiences, and guides.",
  path: "/wishlist",
});

export default async function WishlistPage() {
  const session = await auth().catch(() => null);
  return (
    <section className="grid gap-6">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Saved" }]} />
      <h1>Saved</h1>
      {session?.user?.id ? <SavedAccountList userId={session.user.id} /> : <LocalWishlist />}
    </section>
  );
}
