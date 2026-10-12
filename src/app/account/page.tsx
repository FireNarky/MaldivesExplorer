import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { publicMetadata } from "@/lib/seo/metadata";
import { readProfile } from "@/modules/customers/service";

export const metadata: Metadata = publicMetadata({
  title: "Account",
  description: "Your Maldives Explorer account.",
  path: "/account",
});

const notices: Record<string, string> = {
  linked: "This account is linked to the trip plan.",
  claim: "The claim link is unused.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  const params = await searchParams;
  const profile = userId ? await readProfile(userId) : null;
  const notice = params.notice ? notices[params.notice] : undefined;
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Account</h1>
      {notice ? <p role="status">{notice}</p> : null}
      {profile ? <p>{profile.email}</p> : null}
      <ul className="grid gap-3">
        <li>
          <Link href="/account/profile" className="font-semibold text-lagoon-ink">
            Profile
          </Link>
        </li>
        <li>
          <Link href="/account/saved" className="font-semibold text-lagoon-ink">
            Saved items
          </Link>
        </li>
        <li>
          <Link href="/account/enquiries" className="font-semibold text-lagoon-ink">
            Enquiries
          </Link>
        </li>
        <li>
          <Link href="/account/messages" className="font-semibold text-lagoon-ink">
            Messages
          </Link>
        </li>
        <li>
          <Link href="/account/preferences" className="font-semibold text-lagoon-ink">
            Preferences
          </Link>
        </li>
        <li>
          <Link href="/account/consent" className="font-semibold text-lagoon-ink">
            Consent
          </Link>
        </li>
        <li>
          <Link href="/account/privacy" className="font-semibold text-lagoon-ink">
            Privacy requests
          </Link>
        </li>
      </ul>
    </section>
  );
}
