import { absoluteUrl } from "@/lib/seo/site";

export type Crumb = { name: string; href?: string };

export function breadcrumbData(items: Crumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export function placeData(input: {
  name: string;
  description: string;
  path: string;
  latitude?: string | null;
  longitude?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    ...(input.latitude && input.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: input.latitude,
            longitude: input.longitude,
          },
        }
      : {}),
  };
}

export function lodgingData(input: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
  };
}

export function attractionData(input: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
  };
}

export function articleData(input: {
  title: string;
  description: string;
  path: string;
  publishedAt?: string | null;
  authorName?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
    ...(input.authorName ? { author: { "@type": "Person", name: input.authorName } } : {}),
  };
}

export function faqPageData(
  items: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function collectionData(input: {
  name: string;
  description: string;
  path: string;
  items: Array<{ name: string; href: string }>;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: input.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.href),
      })),
    },
  };
}

export function websiteSearchData(origin: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Maldives Explorer",
    url: origin,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
