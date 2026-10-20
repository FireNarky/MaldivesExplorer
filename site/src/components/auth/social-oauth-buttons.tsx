"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, X } from "lucide-react";

interface SocialOAuthButtonsProps {
  mode?: "login" | "register";
}

export function SocialOAuthButtons({ mode = "login" }: SocialOAuthButtonsProps) {
  const [modalProvider, setModalProvider] = useState<"google" | "facebook" | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedVar(text);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <>
      <div className="grid gap-3">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
          {mode === "login" ? "Or sign in with" : "Or continue with"}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Google Button */}
          <button
            type="button"
            onClick={() => setModalProvider("google")}
            className="group relative flex items-center justify-center gap-2.5 rounded-xl border border-border-subtle bg-white dark:bg-white/5 px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-lagoon/60 hover:bg-mist/40 dark:hover:bg-white/10 active:scale-[0.98]"
          >
            {/* Google G logo SVG */}
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="shrink-0">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="truncate">Google</span>
            <span className="ml-auto text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 font-bold tracking-wider">
              SETUP
            </span>
          </button>

          {/* Facebook Button */}
          <button
            type="button"
            onClick={() => setModalProvider("facebook")}
            className="group relative flex items-center justify-center gap-2.5 rounded-xl border border-border-subtle bg-white dark:bg-white/5 px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-lagoon/60 hover:bg-mist/40 dark:hover:bg-white/10 active:scale-[0.98]"
          >
            {/* Facebook F logo SVG */}
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="shrink-0">
              <path
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                fill="#1877F2"
              />
            </svg>
            <span className="truncate">Facebook</span>
            <span className="ml-auto text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 font-bold tracking-wider">
              SETUP
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-border-subtle" />
          <span className="text-xs font-medium text-muted">
            {mode === "login" ? "or continue with email & password" : "or register with email"}
          </span>
          <div className="h-px flex-1 bg-border-subtle" />
        </div>
      </div>

      {/* OAuth Setup Guidance Modal */}
      {modalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border-subtle bg-white dark:bg-[#0c1c24] p-6 shadow-3 animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setModalProvider(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-mist dark:hover:bg-white/10 hover:text-ink transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-lagoon/15 dark:bg-cyan-500/15 text-lagoon-ink dark:text-cyan-400">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ocean">
                  {modalProvider === "google" ? "Google Sign-In Setup" : "Facebook Login Setup"}
                </h3>
                <p className="text-xs text-muted">API Keys Configuration Ready</p>
              </div>
            </div>

            <p className="text-sm text-ink leading-relaxed mb-4">
              Social authentication is fully integrated into the backend. Simply add your developer credentials to your server environment file (<code className="rounded bg-mist/60 dark:bg-white/10 px-1 py-0.5 font-mono text-xs">.env</code>) to activate live one-click login:
            </p>

            <div className="space-y-2 rounded-2xl border border-border-subtle bg-sand/70 dark:bg-white/5 p-4 text-xs font-mono">
              {modalProvider === "google" ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">AUTH_GOOGLE_ID=your-google-client-id</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("AUTH_GOOGLE_ID=")}
                      className="text-lagoon-ink hover:underline flex items-center gap-1 font-sans"
                    >
                      {copiedVar === "AUTH_GOOGLE_ID=" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedVar === "AUTH_GOOGLE_ID=" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-border-subtle/60 pt-2">
                    <span className="text-muted">AUTH_GOOGLE_SECRET=your-google-secret</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("AUTH_GOOGLE_SECRET=")}
                      className="text-lagoon-ink hover:underline flex items-center gap-1 font-sans"
                    >
                      {copiedVar === "AUTH_GOOGLE_SECRET=" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedVar === "AUTH_GOOGLE_SECRET=" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">AUTH_FACEBOOK_ID=your-facebook-app-id</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("AUTH_FACEBOOK_ID=")}
                      className="text-lagoon-ink hover:underline flex items-center gap-1 font-sans"
                    >
                      {copiedVar === "AUTH_FACEBOOK_ID=" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedVar === "AUTH_FACEBOOK_ID=" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-border-subtle/60 pt-2">
                    <span className="text-muted">AUTH_FACEBOOK_SECRET=your-app-secret</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("AUTH_FACEBOOK_SECRET=")}
                      className="text-lagoon-ink hover:underline flex items-center gap-1 font-sans"
                    >
                      {copiedVar === "AUTH_FACEBOOK_SECRET=" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedVar === "AUTH_FACEBOOK_SECRET=" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </>
              )}
            </div>

            <p className="mt-3 text-[11px] text-muted leading-relaxed">
              Callback URL for {modalProvider === "google" ? "Google Cloud Console" : "Meta Developers"}:
              <br />
              <code className="text-lagoon-ink dark:text-cyan-400 font-mono break-all">
                https://xplorer.itnvend.com/api/auth/callback/{modalProvider}
              </code>
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalProvider(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold bg-mist dark:bg-white/10 text-ocean dark:text-white hover:bg-mist/80 transition"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
