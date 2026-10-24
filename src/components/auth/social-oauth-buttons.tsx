import type { ReactElement } from "react";
import { oauthProviderLabels, type OAuthProviderId } from "@/lib/auth/oauth-providers";

interface SocialOAuthButtonsProps {
  /** Provider ids the server reports as configured. Nothing is rendered when this is empty. */
  providers: readonly OAuthProviderId[];
  action: (formData: FormData) => Promise<void>;
  next?: string | null;
  claim?: string | null;
}

function GoogleMark() {
  return (
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
  );
}

const marks: Record<OAuthProviderId, () => ReactElement> = { google: GoogleMark };

/**
 * Social sign-in buttons. Each one submits a real server action; a provider that is not
 * configured is simply not rendered, and with no providers the whole block (divider included)
 * disappears. Only provider ids reach this component, never a credential.
 */
export function SocialOAuthButtons({ providers, action, next, claim }: SocialOAuthButtonsProps) {
  if (providers.length === 0) return null;
  return (
    <div className="mb-6 grid gap-3" data-testid="social-oauth">
      <div className={providers.length > 1 ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
        {providers.map((id) => (
          <form key={id} action={action}>
            <input type="hidden" name="provider" value={id} />
            {next ? <input type="hidden" name="next" value={next} /> : null}
            {claim ? <input type="hidden" name="claim" value={claim} /> : null}
            <button
              type="submit"
              className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl border border-border-subtle bg-white dark:bg-white/5 px-4 py-3 text-sm font-medium text-ink shadow-sm transition hover:border-lagoon/50 hover:bg-mist/30 dark:hover:bg-white/10 active:scale-[0.98]"
            >
              {marks[id]()}
              <span className="font-semibold text-ocean">
                Continue with {oauthProviderLabels[id]}
              </span>
            </button>
          </form>
        ))}
      </div>
      <p className="text-xs text-muted">
        Social sign-in works for an existing account with the same verified email address.
      </p>
      <div className="relative my-2 flex items-center gap-3">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs font-medium text-muted">or sign in with email</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>
    </div>
  );
}
