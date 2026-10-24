/** Client-safe provider metadata. It contains no environment access and no credentials. */

export const oauthProviderIds = ["google"] as const;
export type OAuthProviderId = (typeof oauthProviderIds)[number];

export const oauthProviderLabels: Record<OAuthProviderId, string> = {
  google: "Google",
};

export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return (oauthProviderIds as readonly string[]).includes(value);
}
