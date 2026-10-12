import type { Metadata } from "next";
import { auth } from "@/auth";
import { SavedAccountList } from "@/components/account/saved-list";
import { publicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicMetadata({
  title: "Saved items",
  description: "Resorts, offers, experiences, and guides saved on your account.",
  path: "/account/saved",
});

export default async function AccountSavedPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  return (
    <section className="grid gap-6">
      <h1>Saved items</h1>
      <SavedAccountList userId={userId} />
    </section>
  );
}
