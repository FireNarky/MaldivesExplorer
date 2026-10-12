import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { publicMetadata } from "@/lib/seo/metadata";
import { unsubscribeForm } from "@/modules/newsletter/actions";
import { readSubscriptionByToken } from "@/modules/newsletter/service";

export const metadata: Metadata = publicMetadata({
  title: "Unsubscribe",
  description: "Stop the Maldives Explorer newsletter.",
  path: "/newsletter/unsubscribe",
});

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const subscription = query.token ? await readSubscriptionByToken(query.token) : null;
  return (
    <article className="grid max-w-[65ch] gap-6">
      <h1>Unsubscribe</h1>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice ? <p role="status">You are unsubscribed.</p> : null}
      {subscription && !query.notice ? (
        <form action={unsubscribeForm} className="grid gap-4">
          <input type="hidden" name="token" value={query.token} />
          <p>{subscription.statusLabel}</p>
          <Button type="submit">Unsubscribe</Button>
        </form>
      ) : null}
      {!subscription && !query.notice ? <p>This link is not valid.</p> : null}
    </article>
  );
}
