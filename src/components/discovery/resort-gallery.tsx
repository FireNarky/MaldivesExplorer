import Image from "next/image";

export type GalleryImage = {
  media: { id: string; altText: string | null };
};

/**
 * Resort photo composition based on how many published, described images exist.
 * Zero images: nothing. One image: a single full-width frame. Two: a pair. Three or more:
 * the existing featured-first grid without empty tracks.
 */
export function ResortGallery({ images }: { images: GalleryImage[] }) {
  const gallery = images.filter((image) => image.media.altText).slice(0, 5);
  if (gallery.length === 0) return null;

  const layout =
    gallery.length === 1
      ? "grid gap-2"
      : gallery.length === 2
        ? "grid gap-2 sm:grid-cols-2"
        : "grid gap-2 sm:grid-cols-3 sm:grid-rows-2 [&>*:first-child]:sm:col-span-2 [&>*:first-child]:sm:row-span-2";

  const sizes =
    gallery.length === 1
      ? "(min-width: 64rem) 60vw, 100vw"
      : gallery.length === 2
        ? "(min-width: 40rem) 50vw, 100vw"
        : "(min-width: 64rem) 40vw, (min-width: 40rem) 50vw, 100vw";

  return (
    <section aria-label="Photos" className={layout} data-gallery-count={gallery.length}>
      {gallery.map((image) => (
        <div
          key={image.media.id}
          className="relative aspect-[3/2] overflow-hidden rounded-lg bg-mist"
        >
          <Image
            src={`/media/${image.media.id}`}
            alt={image.media.altText ?? ""}
            fill
            sizes={sizes}
            className="object-cover"
          />
        </div>
      ))}
    </section>
  );
}
