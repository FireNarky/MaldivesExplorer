import type { Metadata } from "next";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { publicMetadata } from "@/lib/seo/metadata";
import { updatePreferencesForm } from "@/modules/customers/actions";
import { readProfile } from "@/modules/customers/service";
import { accountNewsletterForm } from "@/modules/newsletter/actions";
import { newsletterTopics, topicLabel } from "@/modules/newsletter/rules";
import { readSubscriptionByEmail } from "@/modules/newsletter/service";

export const metadata: Metadata = publicMetadata({
  title: "Preferences",
  description: "Language for your account.",
  path: "/account/preferences",
});

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth().catch(() => null);
  const profile = await readProfile(session?.user?.id || "");
  const subscription = await readSubscriptionByEmail(profile.email);
  const params = await searchParams;
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Preferences</h1>
      {params.saved ? <p role="status">Preferences saved.</p> : null}
      {params.error ? <FieldError>{params.error}</FieldError> : null}
      <form action={updatePreferencesForm} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="locale">Language</Label>
          <select
            id="locale"
            name="locale"
            defaultValue={profile.locale === "en" ? "en" : "en"}
            className="min-h-11 rounded-sm border border-border bg-white px-4 text-base"
          >
            <option value="en">English</option>
          </select>
        </div>
        <Button type="submit">Save preferences</Button>
      </form>
      <section className="grid gap-4">
        <h2>Newsletter</h2>
        {subscription ? (
          <>
            <p>{subscription.statusLabel}</p>
            <form action={accountNewsletterForm} className="grid gap-4">
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
              <Button type="submit">Save newsletter topics</Button>
            </form>
            <form action={accountNewsletterForm}>
              <input type="hidden" name="intent" value="unsubscribe" />
              <Button type="submit" variant="secondary">
                Unsubscribe
              </Button>
            </form>
          </>
        ) : (
          <p>This account email is not subscribed.</p>
        )}
      </section>
    </section>
  );
}
