import { readPublishedMedia } from "@/modules/media";
import { mediaStorage } from "@/modules/media/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const asset = await readPublishedMedia(id).catch(() => null);
  if (!asset) return new Response(null, { status: 404 });
  const body = await mediaStorage()
    .get(asset.storageKey)
    .catch(() => null);
  if (!body) return new Response(null, { status: 404 });
  return new Response(Buffer.from(body), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
