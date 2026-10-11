import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";

type PublicMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
};

export function publicMetadata(input: PublicMetadataInput): Metadata {
  const description = input.description.trim() || "Maldives Explorer";
  const canonical = absoluteUrl(input.path);
  return {
    title: input.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: input.title,
      description,
      url: canonical,
      siteName: "Maldives Explorer",
      type: input.type ?? "website",
      images: input.image ? [{ url: absoluteUrl(input.image) }] : undefined,
    },
    robots: { index: false, follow: false },
  };
}
