import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { publicMetadata } from "@/lib/seo/metadata";
import { requestDeletionForm, requestExportForm } from "@/modules/customers/actions";

export const metadata: Metadata = publicMetadata({
  title: "Privacy",
  description: "Export and deletion requests for your account.",
  path: "/account/privacy",
});

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ export?: string; deletion?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Privacy</h1>
      {params.error ? <FieldError>{params.error}</FieldError> : null}
      <section className="grid gap-3">
        <h2>Data export</h2>
        <p>
          A request covers your profile, saved items, trip plans, child ages, messages, consent
          records, and sent quotes.
        </p>
        {params.export ? (
          <p role="status">The export request is recorded. A file is not available on this page.</p>
        ) : null}
        <form action={requestExportForm}>
          <Button type="submit" variant="secondary">
            Record an export request
          </Button>
        </form>
      </section>
      <section className="grid gap-3">
        <h2>Deletion</h2>
        <p>A deletion request is recorded. This account stays open.</p>
        {params.deletion ? <p role="status">The deletion request is recorded.</p> : null}
        <form action={requestDeletionForm}>
          <Button type="submit" variant="destructive">
            Record a deletion request
          </Button>
        </form>
      </section>
      <p>
        Name and phone changes are saved on{" "}
        <Link href="/account/profile" className="font-semibold text-lagoon-ink">
          Profile
        </Link>
        .
      </p>
    </section>
  );
}
