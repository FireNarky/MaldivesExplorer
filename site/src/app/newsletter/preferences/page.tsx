import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { publicMetadata } from "@/lib/seo/metadata";
import { preferencesForm } from "@/modules/newsletter/actions";
import { newsletterTopics, topicLabel } from "@/modules/newsletter/rules";
import { readSubscriptionByToken } from "@/modules/newsletter/service";

export const metadata: Metadata = publicMetadata({
  title: "Newsletter preferences",
  description: "Choose newsletter topics.",
  path: "/newsletter/preferences",
});

export default async function NewsletterPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const subscription = query.token ? await readSubscriptionByToken(query.token) : null;
  return (
    <article className="grid max-w-[65ch] gap-6">
      <h1>Newsletter preferences</h1>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice ? <p role="status">Saved.</p> : null}
      {subscription ? (
        <>
          <p>{subscription.statusLabel}</p>
          <form action={preferencesForm} className="grid gap-4">
            <input type="hidden" name="token" value={query.token} />
            <fieldset className="grid gap-2">
              <legend className="font-semibold">Topics</legend>
              {newsletterTopics.map((topic) => (
                <label key={topic} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    name="topics"
                    value={topic}
                    defaultChecked={subscription.topics.includes(topic)}
                  />
                  {topicLabel(topic)}
                </label>
              ))}
            </fieldset>
            <Button type="submit">Save preferences</Button>
          </form>
          <p>
            <Link
              href={`/newsletter/unsubscribe?token=${encodeURIComponent(query.token ?? "")}`}
              className="font-semibold text-lagoon-ink"
            >
              Unsubscribe
            </Link>
          </p>
        </>
      ) : (
        <p>This link is not valid.</p>
      )}
    </article>
  );
}
