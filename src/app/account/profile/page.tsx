import type { Metadata } from "next";
import { auth } from "@/auth";
import { FieldError } from "@/components/ui/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicMetadata } from "@/lib/seo/metadata";
import { updateProfileForm } from "@/modules/customers/actions";
import { readProfile } from "@/modules/customers/service";

export const metadata: Metadata = publicMetadata({
  title: "Profile",
  description: "Name and contact details on your account.",
  path: "/account/profile",
});

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  const profile = await readProfile(userId);
  const params = await searchParams;
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Profile</h1>
      {params.saved ? <p role="status">Profile saved.</p> : null}
      {params.error ? <FieldError>{params.error}</FieldError> : null}
      <form action={updateProfileForm} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required defaultValue={profile.name} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={profile.email} readOnly />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">
            Phone <span className="font-normal">Optional</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            autoComplete="tel"
            maxLength={40}
            defaultValue={profile.phone}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="countryCode">
            Country code <span className="font-normal">Optional</span>
          </Label>
          <Input
            id="countryCode"
            name="countryCode"
            autoComplete="country"
            maxLength={2}
            defaultValue={profile.countryCode}
          />
          <p>Two letters, such as MV.</p>
        </div>
        <Button type="submit">Save profile</Button>
      </form>
    </section>
  );
}
