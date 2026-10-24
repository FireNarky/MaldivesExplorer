import { readPublishedMedia } from "@/modules/media";
import { mediaStorage } from "@/modules/media/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const asset = await readPublishedMedia(id).catch(() => null);
  if (!asset) return new Response(null, { status: 404 });

  const etag = `"${asset.storageKey}:${asset.updatedAt.getTime()}:${asset.byteSize}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  const body = await mediaStorage()
    .get(asset.storageKey)
    .catch(() => null);
  if (!body) return new Response(null, { status: 404 });

  // Bytes under a given id can change after unpublish/edit/republish, so this is not immutable.
  // A day-long max-age plus SWR and an ETag still avoids re-downloading unchanged assets.
  return new Response(Buffer.from(body), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
