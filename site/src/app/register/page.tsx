import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  Eye,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAccount } from "@/modules/identity/actions";
import { claimToken } from "@/modules/customers/rules";
import { publicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicMetadata({
  title: "Create Account · Maldives Explorer",
  description: "Join Maldives Explorer to save itineraries, receive bespoke resort quotes, and manage your luxury island journey.",
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

          {/* Social OAuth – stubs (keys not yet configured) */}
          <div className="mb-6 grid gap-3">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
              Continue with
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Google */}
              <button
                type="button"
                disabled
                title="Google sign-in coming soon – API key pending"
                className="flex items-center justify-center gap-2.5 rounded-xl border border-border-subtle bg-white dark:bg-white/5 px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-lagoon-ink/40 hover:bg-mist/40 dark:hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {/* Google G logo SVG */}
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
                <span className="ml-auto text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 font-bold">SOON</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                disabled
                title="Facebook sign-in coming soon – API key pending"
                className="flex items-center justify-center gap-2.5 rounded-xl border border-border-subtle bg-white dark:bg-white/5 px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-lagoon-ink/40 hover:bg-mist/40 dark:hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {/* Facebook F logo SVG */}
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
                </svg>
                Facebook
                <span className="ml-auto text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 font-bold">SOON</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="h-px flex-1 bg-border-subtle" />
              <span className="text-xs font-medium text-muted">or register with email</span>
              <div className="h-px flex-1 bg-border-subtle" />
            </div>
          </div>

          {/* Registration Form */}
          <form action={registerAccount} className="grid gap-4">
            {claim ? <input type="hidden" name="claim" value={claim} /> : null}

            {/* Name */}
            <div className="grid gap-1.5">
              <Label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-muted">
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
              <Label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-muted">
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
              <Label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-muted">
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

        {/* Trust Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            End-to-End Encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <Waves size={14} className="text-lagoon-ink dark:text-cyan-400" />
            Direct Resort Quotes
          </span>
          <span className="flex items-center gap-1.5">
            <Compass size={14} className="text-coral" />
            24/7 Island Concierge
          </span>
        </div>
      </div>
    </div>
  );
}
