export function siteOrigin(source: Record<string, string | undefined> = process.env): string {
  const authUrl = source.AUTH_URL?.trim();
  if (authUrl) {
    try {
      return new URL(authUrl).origin;
    } catch {
      return "http://127.0.0.1:3000";
    }
  }
  return "http://127.0.0.1:3000";
}

export function absoluteUrl(path: string, origin = siteOrigin()): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, origin).toString();
}
