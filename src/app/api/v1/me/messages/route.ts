import { NextResponse } from "next/server";
import { portalErrorResponse, requirePortalUser } from "@/modules/customers/http";
import { listMessageThreads, postOwnMessage, readOwnThread } from "@/modules/customers/records";

export async function GET(request: Request) {
  try {
    const userId = await requirePortalUser();
    const reference = new URL(request.url).searchParams.get("reference");
    if (!reference) {
      return NextResponse.json({ threads: await listMessageThreads(userId) });
    }
    const thread = await readOwnThread(userId, reference);
    if (!thread)
      return NextResponse.json({ message: "That record is not available." }, { status: 404 });
    return NextResponse.json({ thread });
  } catch (error) {
    return portalErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requirePortalUser();
    const body = (await request.json()) as { reference?: unknown; body?: unknown };
    if (typeof body.reference !== "string" || typeof body.body !== "string") {
      return NextResponse.json({ message: "Enter a message." }, { status: 400 });
    }
    await postOwnMessage(userId, body.reference, body.body);
    const thread = await readOwnThread(userId, body.reference);
    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
