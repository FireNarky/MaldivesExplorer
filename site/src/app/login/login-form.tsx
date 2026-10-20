"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  Eye,
  EyeOff,
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
import { FieldError } from "@/components/ui/field-error";

interface LoginFormProps {
  message?: string;
  sent?: string;
  next?: string | null;
  claim?: string | null;
  registerHref: string;
  passwordSignInAction: (formData: FormData) => Promise<void>;
  requestMagicLinkAction: (formData: FormData) => Promise<void>;
}

export function LoginForm({
  message,
  sent,
  next,
  claim,
  registerHref,
  passwordSignInAction,
  requestMagicLinkAction,
}: LoginFormProps) {
  const [tab, setTab] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          Access your bespoke itineraries, confirmed seaplane vouchers, and exclusive island quotes.
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

        {/* Quick UAT Test Credential Bar */}
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                fillCredentials("browser-admin@example.com", "AdminPassword123!", "Admin")
              }
              className="flex items-center justify-between rounded-xl border border-border-subtle bg-white dark:bg-white/5 px-3 py-2 text-left text-xs font-medium text-ink transition hover:border-lagoon-ink hover:bg-mist/40 dark:hover:bg-white/10 active:scale-95"
            >
              <div className="min-w-0">
                <span className="block font-semibold text-ocean">Admin Portal</span>
                <span className="block truncate text-[11px] text-muted">browser-admin@...</span>
              </div>
              <span className="text-[10px] text-lagoon-ink dark:text-cyan-400 font-bold">FILL</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("traveler@example.com", "Traveler123!", "Traveler")}
              className="flex items-center justify-between rounded-xl border border-border-subtle bg-white dark:bg-white/5 px-3 py-2 text-left text-xs font-medium text-ink transition hover:border-lagoon-ink hover:bg-mist/40 dark:hover:bg-white/10 active:scale-95"
            >
              <div className="min-w-0">
                <span className="block font-semibold text-ocean">Traveler Guest</span>
                <span className="block truncate text-[11px] text-muted">traveler@...</span>
              </div>
              <span className="text-[10px] text-lagoon-ink dark:text-cyan-400 font-bold">FILL</span>
            </button>
          </div>
        </div>

        {/* Social OAuth – stubs */}
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
            <span className="text-xs font-medium text-muted">or sign in with email</span>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-border-subtle bg-sand/60 dark:bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setTab("password")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-semibold transition-all ${
              tab === "password"
                ? "bg-white dark:bg-white/10 text-ocean shadow-sm ring-1 ring-border-subtle/50"
                : "text-muted hover:text-ink"
            }`}
          >
            <Lock size={14} />
            Password
          </button>
          <button
            type="button"
            onClick={() => setTab("magic")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-semibold transition-all ${
              tab === "magic"
                ? "bg-white dark:bg-white/10 text-ocean shadow-sm ring-1 ring-border-subtle/50"
                : "text-muted hover:text-ink"
            }`}
          >
            <Mail size={14} />
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
              <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-muted">
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
                <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-lagoon-ink hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="min-h-12 w-full rounded-xl border border-border bg-white dark:bg-white/5 pl-10 pr-11 text-sm text-ink transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-ink transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              We will send a one-time passwordless sign-in link directly to your inbox. No password needed.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="magic-email" className="text-xs font-semibold uppercase tracking-wider text-muted">
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

      {/* Trust reassurance pills */}
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
  );
}
