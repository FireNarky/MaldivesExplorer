import type { Metadata } from "next";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { publicMetadata } from "@/lib/seo/metadata";
import { updateConsentForm } from "@/modules/customers/actions";
import { consentPurposeLabel, readConsent } from "@/modules/customers/service";

export const metadata: Metadata = publicMetadata({
  title: "Consent",
  description: "Consent preferences on your account.",
  path: "/account/consent",
});

const descriptions: Record<string, string> = {
  ACCOUNT: "Maldives Explorer may keep this account.",
  ENQUIRY_CONTACT: "Maldives Explorer may contact me about a trip plan.",
  ANALYTICS: "Search analytics may be stored for this account.",
  MARKETING: "Maldives Explorer may send messages that are not about an open trip plan.",
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth().catch(() => null);
  const choices = await readConsent(session?.user?.id || "");
  const params = await searchParams;
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Consent</h1>
      {params.saved ? <p role="status">Consent preferences saved.</p> : null}
      {params.error ? <FieldError>{params.error}</FieldError> : null}
      <form action={updateConsentForm} className="grid gap-4">
        <fieldset className="grid gap-4">
          <legend className="font-semibold">Consent preferences</legend>
          {choices.map((choice) => (
            <label key={choice.purpose} className="grid gap-1">
              <span className="inline-flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  name="purpose"
                  value={choice.purpose}
                  defaultChecked={choice.status === "GRANTED"}
                  className="size-5"
                />
                <span className="font-semibold">{consentPurposeLabel(choice.purpose)}</span>
              </span>
              <span>{descriptions[choice.purpose]}</span>
            </label>
          ))}
        </fieldset>
        <Button type="submit">Save consent</Button>
      </form>
    </section>
  );
}
