import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeMfa, enrollmentUri } from "@/modules/identity/actions";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const uri = await enrollmentUri();
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Staff verification</h1>
      <p>Enter the 6-digit code from an authenticator.</p>
      {params.error ? <FieldError>That code was not accepted.</FieldError> : null}
      {uri ? (
        <p className="break-all">
          Add this authenticator key: <span className="font-semibold">{uri}</span>
        </p>
      ) : null}
      <form action={completeMfa} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
        </div>
        <Button type="submit">Continue</Button>
      </form>
    </section>
  );
}
