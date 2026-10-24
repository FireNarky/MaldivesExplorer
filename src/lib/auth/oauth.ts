/**
 * Social sign-in availability. This is the single place that decides which OAuth providers exist.
 * It reads server environment variables, so it must only be imported from server code; client
 * components receive the resulting provider ids as plain props and never see a credential.
 *
 * A provider is available only when BOTH its client id and secret are set AND it can assert that
 * the email address was verified by the provider. Sign-in links to an existing customer account by
 * that verified email; it never creates accounts (registration records terms consent) and never
 * signs in staff (staff use password plus MFA). Facebook's profile carries no verified-email
 * assertion, so it stays unavailable until the business decides on a verified-link policy.
 */

import { oauthProviderIds, type OAuthProviderId } from "@/lib/auth/oauth-providers";

export { isOAuthProviderId } from "@/lib/auth/oauth-providers";
export type { OAuthProviderId } from "@/lib/auth/oauth-providers";

type Env = Record<string, string | undefined>;

const credentialKeys: Record<OAuthProviderId, readonly [string, string]> = {
  google: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
};

export function oauthCredentials(
  provider: OAuthProviderId,
  env: Env = process.env,
): { clientId: string; clientSecret: string } | null {
  const [idKey, secretKey] = credentialKeys[provider];
  const clientId = env[idKey]?.trim();
  const clientSecret = env[secretKey]?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function configuredOAuthProviders(env: Env = process.env): OAuthProviderId[] {
  return oauthProviderIds.filter((provider) => oauthCredentials(provider, env) !== null);
}

/** The provider-verified email for an OAuth profile, or null when it is absent or unverified. */
export function verifiedOAuthEmail(
  provider: string,
  profile: Record<string, unknown> | null | undefined,
): string | null {
  if (provider !== "google" || !profile) return null;
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  return email && profile.email_verified === true ? email : null;
}
