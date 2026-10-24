"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/ui/password-field";
import { FieldError } from "@/components/ui/field-error";
import { SocialOAuthButtons } from "@/components/auth/social-oauth-buttons";
import type { OAuthProviderId } from "@/lib/auth/oauth-providers";

interface LoginFormProps {
  message?: string;
  sent?: string;
  next?: string | null;
  claim?: string | null;
  registerHref: string;
  /** Present only when the server-side local UAT gate is open (see lib/auth/uat.ts). */
  uatCredentials?: { email: string; password: string } | null;
  /** Provider ids the server reports as configured; empty hides social sign-in entirely. */
  oauthProviders?: readonly OAuthProviderId[];
  oauthSignInAction?: (formData: FormData) => Promise<void>;
  passwordSignInAction: (formData: FormData) => Promise<void>;
  requestMagicLinkAction: (formData: FormData) => Promise<void>;
}

export function LoginForm({
  message,
  sent,
  next,
  claim,
  registerHref,
  uatCredentials = null,
  oauthProviders = [],
  oauthSignInAction,
  passwordSignInAction,
  requestMagicLinkAction,
}: LoginFormProps) {
  const [tab, setTab] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [filledTarget, setFilledTarget] = useState<string | null>(null);

  const fillCredentials = (e: string, p: string, label: string) => {
    setEmail(e);
    setPassword(p);
    setFilledTarget(label);
    setTimeout(() => setFilledTarget(null), 2500);
  };

  return (
    <div className="mx-auto w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Decorative Brand Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lagoon to-ocean text-white shadow-2 ring-4 ring-mist/50 dark:ring-ocean/40 transition-transform hover:scale-105">
          <Compass size={28} className="animate-spin-slow" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-mist/60 dark:bg-white/5 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
          <Sparkles size={13} className="text-coral" />
          Maldives Explorer Access
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-display font-medium text-ocean">
          Welcome to Your Sanctuary
        </h1>
        <p className="mt-1 text-sm sm:text-base text-muted">
          Access your saved shortlists, trip enquiries, and written quotes.
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-white/90 dark:bg-white/5 p-6 sm:p-8 shadow-2 backdrop-blur-xl transition-all">
        {/* Subtle decorative glowing corner gradient */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-lagoon/15 dark:bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-48 rounded-full bg-coral/15 dark:bg-coral/10 blur-3xl" />

        {/* Status Alerts */}
        {message ? (
          <div className="mb-5 rounded-xl border border-danger/20 bg-danger-surface p-3.5 text-sm text-danger animate-in fade-in">
            <FieldError>{message}</FieldError>
          </div>
        ) : null}

        {sent ? (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/20 bg-success-surface p-3.5 text-sm font-medium text-success animate-in fade-in">
            <Check size={18} className="shrink-0" />
            <span>If an account exists, a secure sign-in link has been sent to your inbox.</span>
          </div>
        ) : null}

        {/* Local-only quick fill: rendered only when the server opened the UAT gate. */}
        {uatCredentials ? (
          <div className="mb-6 rounded-2xl border border-border-subtle/80 bg-sand/70 dark:bg-white/5 p-3.5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
                <KeyRound size={13} className="text-lagoon-ink dark:text-cyan-400" />
                Quick UAT Fill
              </span>
              {filledTarget && (
                <span className="font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  ✓ Filled {filledTarget}!
                </span>
              )}
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() =>
                  fillCredentials(uatCredentials.email, uatCredentials.password, "Admin")
                }
                className="flex items-center justify-between rounded-xl border border-border-subtle bg-white dark:bg-white/5 px-3 py-2 text-left text-xs font-medium text-ink transition hover:border-lagoon-ink hover:bg-mist/40 dark:hover:bg-white/10 active:scale-95"
              >
                <div className="min-w-0">
                  <span className="block font-semibold text-ocean">Local admin</span>
                  <span className="block truncate text-[11px] text-muted">
                    {uatCredentials.email}
                  </span>
                </div>
                <span className="text-[10px] text-lagoon-ink dark:text-cyan-400 font-bold">
                  FILL
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Social sign-in: only providers configured on the server are rendered. */}
        {oauthSignInAction ? (
          <SocialOAuthButtons
            providers={oauthProviders}
            action={oauthSignInAction}
            next={next}
            claim={claim}
          />
        ) : null}

        {/* Mode switcher — two exclusive modes, not a tablist (content swaps; no tabpanels). */}
        <div
          className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-border-subtle bg-sand/60 dark:bg-white/5 p-1"
          role="group"
          aria-label="Sign-in method"
        >
          <button
            type="button"
            onClick={() => setTab("password")}
            aria-pressed={tab === "password"}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              tab === "password"
                ? "bg-white dark:bg-white/10 text-ocean shadow-sm ring-1 ring-border-subtle/50"
                : "text-muted hover:text-ink"
            }`}
          >
            <Lock size={14} aria-hidden="true" />
            Password
          </button>
          <button
            type="button"
            onClick={() => setTab("magic")}
            aria-pressed={tab === "magic"}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              tab === "magic"
                ? "bg-white dark:bg-white/10 text-ocean shadow-sm ring-1 ring-border-subtle/50"
                : "text-muted hover:text-ink"
            }`}
          >
            <Mail size={14} aria-hidden="true" />
            Magic Link
          </button>
        </div>

        {/* Password Sign In Form */}
        {tab === "password" && (
          <form
            action={passwordSignInAction}
            className="grid gap-4 animate-in fade-in duration-200"
          >
            {next ? <input type="hidden" name="next" value={next} /> : null}
            {claim ? <input type="hidden" name="claim" value={claim} /> : null}

            <div className="grid gap-1.5">
              <Label
                htmlFor="login-email"
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
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="traveler@example.com"
                  className="min-h-12 w-full rounded-xl border border-border bg-white dark:bg-white/5 pl-10 pr-4 text-sm text-ink transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="login-password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-lagoon-ink hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordField
                id="login-password"
                name="password"
                autoComplete="current-password"
                required
                withIcon
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="min-h-12 w-full rounded-xl border border-border bg-white dark:bg-white/5 text-sm text-ink transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              />
            </div>

            <Button
              type="submit"
              variant="conversion"
              className="mt-2 min-h-12 w-full rounded-xl text-base font-semibold shadow-2 group"
            >
              Sign In to Maldives Explorer
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </Button>
          </form>
        )}

        {/* Magic Link Form */}
        {tab === "magic" && (
          <form
            action={requestMagicLinkAction}
            className="grid gap-4 animate-in fade-in duration-200"
          >
            <p className="text-xs text-muted leading-relaxed">
              We will send a one-time passwordless sign-in link directly to your inbox. No password
              needed.
            </p>
            <div className="grid gap-1.5">
              <Label
                htmlFor="magic-email"
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
                  id="magic-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="traveler@example.com"
                  className="min-h-12 w-full rounded-xl border border-border bg-white dark:bg-white/5 pl-10 pr-4 text-sm text-ink transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              className="mt-2 min-h-12 w-full rounded-xl text-base font-semibold shadow-1"
            >
              Send Secure Magic Link
            </Button>
          </form>
        )}

        {/* Footer links */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle/80 pt-5 text-xs text-muted">
          <span>Don&apos;t have an account yet?</span>
          <Link
            href={registerHref}
            className="inline-flex items-center gap-1 font-semibold text-lagoon-ink hover:underline"
          >
            Create an Account &rarr;
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
  );
}
