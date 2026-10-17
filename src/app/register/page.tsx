import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileField } from "@/components/security/turnstile-field";
import { registerAccount } from "@/modules/identity/actions";
import { claimToken } from "@/modules/customers/rules";

const messages: Record<string, string> = {
  invalid: "Check the name and use at least 12 characters.",
  unavailable: "That email cannot be registered.",
  check: "The check could not be confirmed.",
  limited: "Try again later.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; claim?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ? messages[params.error] : undefined;
  const claim = claimToken(params.claim ?? "");
  const signInHref = claim ? `/login?claim=${encodeURIComponent(claim)}` : "/login";
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Create an account</h1>
      {message ? <FieldError>{message}</FieldError> : null}
      <form action={registerAccount} className="grid gap-4">
        {claim ? <input type="hidden" name="claim" value={claim} /> : null}
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <TurnstileField />
        <Button type="submit">Create account</Button>
      </form>
      <p>
        <Link href={signInHref} className="font-semibold text-lagoon-ink">
          Sign in
        </Link>
      </p>
    </section>
  );
}
