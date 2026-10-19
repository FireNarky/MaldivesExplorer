import type { MetadataRoute } from "next";
import { logError } from "@/lib/observability/log";
import { absoluteUrl } from "@/lib/seo/site";
import { listSitemapEntries } from "@/modules/discovery";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries = await listSitemapEntries();
    return entries.map((entry) => ({
      url: absoluteUrl(entry.path),
      lastModified: entry.updatedAt,
    }));
  } catch (error) {
    logError(error instanceof Error ? error.message : "The sitemap could not be loaded.");
    return [];
  }
}
