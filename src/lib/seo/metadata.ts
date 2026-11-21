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
  const cleanTitle =
    input.title.replace(/\s*[·|-]\s*Thari Ventures\s*$/i, "").trim() || input.title;
  const description = input.description.trim() || "Thari Ventures";
  const canonical = absoluteUrl(input.path);
  return {
    title: cleanTitle,
    description,
    alternates: { canonical },
    openGraph: {
      title: cleanTitle,
      description,
      url: canonical,
      siteName: "Thari Ventures",
      type: input.type ?? "website",
      images: input.image ? [{ url: absoluteUrl(input.image) }] : undefined,
    },
    robots: { index: false, follow: false },
  };
}
