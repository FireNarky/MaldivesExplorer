import type { Metadata } from "next";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { FieldError } from "@/components/ui/field-error";
import { publicMetadata } from "@/lib/seo/metadata";
import { currentNoticeVersion } from "@/modules/newsletter/service";

export const metadata: Metadata = publicMetadata({
  title: "Newsletter",
  description: "Subscribe to notes from Maldives Explorer.",
  path: "/newsletter",
});

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const noticeVersion = await currentNoticeVersion();
  return (
    <article className="grid max-w-[65ch] gap-6">
      <h1>Newsletter</h1>
      <p>
        Notes are occasional. Consent is stored with the address, and unsubscribe stops further
        mail.
      </p>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice ? <p role="status">Saved.</p> : null}
      <SubscribeForm
        idPrefix="newsletter"
        noticeVersion={noticeVersion}
        returnPath="/newsletter"
        showTopics
      />
    </article>
  );
}
