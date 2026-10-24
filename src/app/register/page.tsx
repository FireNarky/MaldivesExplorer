import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Eye, Lock, Mail, ShieldCheck, Sparkles, User, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAccount } from "@/modules/identity/actions";
import { claimToken } from "@/modules/customers/rules";
import { publicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicMetadata({
  title: "Create Account",
  description:
    "Join Maldives Explorer to save itineraries, receive written resort quotes, and manage your trip enquiries.",
  path: "/register",
});

const messages: Record<string, string> = {
  invalid: "Please enter a valid name and a password of at least 12 characters.",
  unavailable: "That email address cannot be registered. Try a different one.",
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
    <div className="py-6 sm:py-12">
      <div className="mx-auto w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lagoon to-ocean text-white shadow-2 ring-4 ring-mist/50 dark:ring-ocean/40 transition-transform hover:scale-105">
            <Compass size={28} className="animate-spin-slow" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-mist/60 dark:bg-white/5 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
            <Sparkles size={13} className="text-coral" />
            New Member
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-display font-medium text-ocean">
            Create Your Account
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted">
            Save itineraries, receive bespoke resort quotes, and plan your perfect Maldives journey.
          </p>
        </div>

        {/* Glass Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-white/90 dark:bg-white/5 p-6 sm:p-8 shadow-2 backdrop-blur-xl">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-lagoon/15 dark:bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-48 rounded-full bg-coral/15 dark:bg-coral/10 blur-3xl" />

          {/* Error */}
          {message ? (
            <div className="mb-5 rounded-xl border border-danger/20 bg-danger-surface p-3.5 text-sm text-danger animate-in fade-in">
              <FieldError>{message}</FieldError>
            </div>
          ) : null}

          {/* Registration Form */}
          <form action={registerAccount} className="grid gap-4">
            {claim ? <input type="hidden" name="claim" value={claim} /> : null}

            {/* Name */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="reg-name"
                className="text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Full Name
              </Label>
              <div className="relative">
                <User
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  id="reg-name"
                  name="name"
                  autoComplete="name"
                  required
                  placeholder="Your full name"
                  className="min-h-12 w-full rounded-xl border border-border bg-white dark:bg-white/5 pl-10 pr-4 text-sm text-ink transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                />
              </div>
            </div>

            {/* Email */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="reg-email"
                className="text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="traveler@example.com"
                  className="min-h-12 w-full rounded-xl border border-border bg-white dark:bg-white/5 pl-10 pr-4 text-sm text-ink transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid gap-1.5">
              <Label
                htmlFor="reg-password"
                className="text-xs font-semibold uppercase tracking-wider text-muted"
              >
                Password
              </Label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  id="reg-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Minimum 12 characters"
                  className="min-h-12 w-full rounded-xl border border-border bg-white dark:bg-white/5 pl-10 pr-11 text-sm text-ink transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                />
                <span
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                >
                  <Eye size={16} />
                </span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Use at least 12 characters, mixing letters and numbers.
              </p>
            </div>

            {/* Terms consent */}
            <label className="flex items-start gap-3 text-xs text-muted leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                name="terms"
                required
                className="mt-0.5 size-4 rounded border-border accent-lagoon"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-semibold text-lagoon-ink hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold text-lagoon-ink hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <Button
              type="submit"
              variant="conversion"
              className="mt-2 min-h-12 w-full rounded-xl text-base font-semibold shadow-2 group"
            >
              Create My Account
              <Sparkles size={16} className="transition-transform group-hover:rotate-12" />
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle/80 pt-5 text-xs text-muted">
            <span>Already have an account?</span>
            <Link
              href={signInHref}
              className="inline-flex items-center gap-1 font-semibold text-lagoon-ink hover:underline"
            >
              Sign In →
            </Link>
          </div>
        </div>

        {/* Account feature summary */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            Password &amp; Magic Link Sign-In
          </span>
          <span className="flex items-center gap-1.5">
            <Waves size={14} className="text-lagoon-ink dark:text-cyan-400" />
            Saved Shortlists &amp; Plans
          </span>
          <span className="flex items-center gap-1.5">
            <Compass size={14} className="text-coral" />
            Written Resort Quotes
          </span>
        </div>
      </div>
    </div>
  );
}
