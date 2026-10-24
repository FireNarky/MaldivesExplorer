import Image from "next/image";
import type { LeadMedia } from "@/modules/media/repository";

/**
 * Hero image for an experience or guide detail page. Renders nothing when the record has no
 * published, described image. The caption is shown only when one was stored on the asset.
 */
export function DetailHero({ media }: { media: LeadMedia | null | undefined }) {
  if (!media) return null;
  return (
    <figure className="grid gap-2">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-mist dark:bg-white/5">
        <Image
          src={`/media/${media.id}`}
          alt={media.altText}
          fill
          unoptimized
          sizes="(min-width: 64rem) 65ch, 100vw"
          className="object-cover"
        />
      </div>
      {media.caption ? (
        <figcaption className="text-sm text-muted">{media.caption}</figcaption>
      ) : null}
    </figure>
  );
}
