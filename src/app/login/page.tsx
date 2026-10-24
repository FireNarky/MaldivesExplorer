import type { Metadata } from "next";
import { publicMetadata } from "@/lib/seo/metadata";
import { configuredOAuthProviders } from "@/lib/auth/oauth";
import { uatQuickFill } from "@/lib/auth/uat";
import { oauthSignIn, passwordSignIn, requestMagicLink } from "@/modules/identity/actions";
import { claimToken, safeAccountPath } from "@/modules/customers/rules";
import { LoginForm } from "./login-form";

const oauthMessage =
  "We could not sign you in with that provider. Social sign-in works only for an existing account with the same verified email address.";

const messages: Record<string, string> = {
  // Codes Auth.js itself may redirect with when a provider flow fails.
  AccessDenied: oauthMessage,
  OAuthSignin: oauthMessage,
  OAuthCallbackError: oauthMessage,
  Configuration: oauthMessage,
  credentials: "Those sign-in credentials do not match our records.",
  limited: "Too many sign-in attempts. Please try again in a few minutes.",
  challenge: "Session expired. Please sign in again.",
  oauth: oauthMessage,
};

export const metadata: Metadata = publicMetadata({
  title: "Sign In",
  description: "Sign in to manage your saved resorts, trip enquiries, and written quotes.",
  path: "/login",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    sent?: string;
    next?: string;
    claim?: string;
    uat?: string;
    dev?: string;
  }>;
}) {
  const params = await searchParams;
  const message = params.error ? messages[params.error] : undefined;
  const next = safeAccountPath(params.next ?? "");
  const claim = claimToken(params.claim ?? "");
  const registerHref = claim ? `/register?claim=${encodeURIComponent(claim)}` : "/register";
  // Both the query flag and the local-only server gate must be open (see lib/auth/uat.ts).
  const uat = params.uat === "1" || params.dev === "1" ? uatQuickFill() : null;
  const oauthProviders = configuredOAuthProviders();

  return (
    <div className="py-6 sm:py-12">
      <LoginForm
        message={message}
        sent={params.sent}
        next={next}
        claim={claim}
        registerHref={registerHref}
        uatCredentials={uat}
        oauthProviders={oauthProviders}
        oauthSignInAction={oauthSignIn}
        passwordSignInAction={passwordSignIn}
        requestMagicLinkAction={requestMagicLink}
      />
    </div>
  );
}
