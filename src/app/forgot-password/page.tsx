import { TurnstileField } from "@/components/security/turnstile-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/modules/identity/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Reset password</h1>
      {params.error === "check" ? <FieldError>The check could not be confirmed.</FieldError> : null}
      {params.sent ? <p>If an account can receive it, a message was queued.</p> : null}
      <form action={requestPasswordReset} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <TurnstileField />
        <Button type="submit">Queue reset message</Button>
      </form>
    </section>
  );
}
