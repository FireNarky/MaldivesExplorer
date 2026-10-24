import type { MediaOwnerType } from "@prisma/client";
import { db } from "@/lib/db";

export const repositoryReady = true;

export type LeadMedia = { id: string; altText: string; caption: string | null };

/**
 * Canonical public lead-image query for any media owner (experience, guide, and so on).
 * A link only qualifies when its asset is published, is an image, and carries alt text, so a
 * page never renders an image that `/media/[id]` would refuse to serve or that has no
 * description. A HERO link wins over other roles; otherwise the first by sort order is used.
 * Captions are returned only when they were stored; nothing is generated.
 */
export async function listLeadMedia(
  ownerType: MediaOwnerType,
  ownerIds: string[],
): Promise<Map<string, LeadMedia>> {
  const lead = new Map<string, LeadMedia>();
  if (ownerIds.length === 0) return lead;
  const links = await db.mediaLink.findMany({
    where: {
      ownerType,
      ownerId: { in: ownerIds },
      media: { status: "PUBLISHED", kind: { in: ["IMAGE", "DRONE"] }, altText: { not: null } },
    },
    orderBy: { sortOrder: "asc" },
    select: {
      ownerId: true,
      role: true,
      media: { select: { id: true, altText: true, caption: true } },
    },
  });
  const consider = (hero: boolean) => {
    for (const link of links) {
      if ((link.role === "HERO") !== hero || lead.has(link.ownerId)) continue;
      const altText = link.media.altText?.trim();
      if (!altText) continue;
      lead.set(link.ownerId, {
        id: link.media.id,
        altText,
        caption: link.media.caption?.trim() || null,
      });
    }
  };
  consider(true);
  consider(false);
  return lead;
}
