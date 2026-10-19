import { auth } from "@/auth";
import { userHasPermission } from "@/modules/identity/service";
import { storeMedia } from "@/modules/media/service";
import { mediaStorage } from "@/modules/media/storage";

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a file." }, { status: 400 });
  }
  try {
    const stored = await storeMedia({
      actorId: session.user.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      body: new Uint8Array(await file.arrayBuffer()),
    });
    return Response.json(stored);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const status = message === "This account cannot store media." ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!(await userHasPermission(session.user.id, "media.read"))) {
    return Response.json({ error: "This account cannot read media." }, { status: 403 });
  }
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return Response.json({ error: "Choose a file." }, { status: 400 });
  try {
    const body = await mediaStorage().get(key);
    if (!body) return Response.json({ error: "File was not found." }, { status: 404 });
    return new Response(Buffer.from(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "File was not found.";
    return Response.json({ error: message }, { status: 400 });
  }
}
