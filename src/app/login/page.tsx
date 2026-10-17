import Link from "next/link";
import { FieldError } from "@/components/ui/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileField } from "@/components/security/turnstile-field";
import { passwordSignIn, requestMagicLink } from "@/modules/identity/actions";
import { claimToken, safeAccountPath } from "@/modules/customers/rules";

const messages: Record<string, string> = {
  credentials: "Those details do not match.",
  limited: "Try again later.",
  challenge: "Sign in again.",
  check: "The check could not be confirmed.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; next?: string; claim?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ? messages[params.error] : undefined;
  const next = safeAccountPath(params.next ?? "");
  const claim = claimToken(params.claim ?? "");
  const registerHref = claim ? `/register?claim=${encodeURIComponent(claim)}` : "/register";
  return (
    <section className="grid max-w-[65ch] gap-8">
      <h1>Sign in</h1>
      {message ? <FieldError>{message}</FieldError> : null}
      {params.sent ? <p>If an account can receive it, a message was queued.</p> : null}
      <form action={passwordSignIn} className="grid gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {claim ? <input type="hidden" name="claim" value={claim} /> : null}
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
            autoComplete="current-password"
            required
          />
        </div>
        <TurnstileField />
        <Button type="submit">Sign in</Button>
      </form>
      <form action={requestMagicLink} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="magic-email">Email a sign-in link</Label>
          <Input id="magic-email" name="email" type="email" autoComplete="username" required />
        </div>
        <TurnstileField />
        <Button type="submit" variant="secondary">
          Queue sign-in link
        </Button>
      </form>
      <p className="flex flex-wrap gap-4">
        <Link href={registerHref} className="font-semibold text-lagoon-ink">
          Create an account
        </Link>
        <Link href="/forgot-password" className="font-semibold text-lagoon-ink">
          Reset password
        </Link>
      </p>
    </section>
  );
}
