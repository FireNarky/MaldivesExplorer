import type { Metadata } from "next";
import { publicMetadata } from "@/lib/seo/metadata";
import { passwordSignIn, requestMagicLink } from "@/modules/identity/actions";
import { claimToken, safeAccountPath } from "@/modules/customers/rules";
import { LoginForm } from "./login-form";

const messages: Record<string, string> = {
  credentials: "Those sign-in credentials do not match our records.",
  limited: "Too many sign-in attempts. Please try again in a few minutes.",
  challenge: "Session expired. Please sign in again.",
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
  const showUat = params.uat === "1" || params.dev === "1";

  return (
    <div className="py-6 sm:py-12">
      <LoginForm
        message={message}
        sent={params.sent}
        next={next}
        claim={claim}
        registerHref={registerHref}
        showUat={showUat}
        passwordSignInAction={passwordSignIn}
        requestMagicLinkAction={requestMagicLink}
      />
    </div>
  );
}
