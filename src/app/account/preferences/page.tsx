import type { Metadata } from "next";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { publicMetadata } from "@/lib/seo/metadata";
import { updatePreferencesForm } from "@/modules/customers/actions";
import { readProfile } from "@/modules/customers/service";

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
    </section>
  );
}
