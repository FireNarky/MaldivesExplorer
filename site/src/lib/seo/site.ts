export function siteOrigin(source: Record<string, string | undefined> = process.env): string {
  const configured = (source.AUTH_URL || source.NEXT_PUBLIC_APP_URL || source.SITE_URL)?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return "https://xplorer.itnvend.com";
    }
  }
  return "https://xplorer.itnvend.com";
}

export function absoluteUrl(path: string, origin = siteOrigin()): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, origin).toString();
}
