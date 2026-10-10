import { randomUUID } from "node:crypto";
import type { MediaKind } from "@prisma/client";
import { db } from "@/lib/db";
import { userHasPermission } from "@/modules/identity/service";
import { mediaStorage } from "@/modules/media/storage";

const imageTypes = new Map<string, MediaKind>([
  ["image/jpeg", "IMAGE"],
  ["image/png", "IMAGE"],
  ["image/webp", "IMAGE"],
]);

const videoTypes = new Map<string, MediaKind>([
  ["video/mp4", "VIDEO"],
  ["video/webm", "VIDEO"],
]);

const imageLimit = 15 * 1024 * 1024;
const videoLimit = 200 * 1024 * 1024;

export type StoredMedia = {
  id: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
};

export function mediaValidationError(mimeType: string, byteSize: number): string | undefined {
  if (byteSize < 1) return "Choose a file with content.";
  if (imageTypes.has(mimeType)) {
    return byteSize <= imageLimit ? undefined : "Images must be 15 MB or smaller.";
  }
  if (videoTypes.has(mimeType)) {
    return byteSize <= videoLimit ? undefined : "Videos must be 200 MB or smaller.";
  }
  return "Use a JPEG, PNG, WebP, MP4, or WebM file.";
}

export async function storeMedia(input: {
  actorId: string;
  fileName: string;
  mimeType: string;
  body: Uint8Array;
}): Promise<StoredMedia> {
  if (!(await userHasPermission(input.actorId, "media.write"))) {
    throw new Error("This account cannot store media.");
  }
  const problem = mediaValidationError(input.mimeType, input.body.byteLength);
  if (problem) throw new Error(problem);
  const kind = imageTypes.get(input.mimeType) ?? videoTypes.get(input.mimeType);
  if (!kind) throw new Error("Use a JPEG, PNG, WebP, MP4, or WebM file.");

  const id = randomUUID();
  const extension = input.fileName.includes(".") ? input.fileName.split(".").pop() : "bin";
  const storageKey = `${id}.${extension ?? "bin"}`;
  await mediaStorage().put(storageKey, input.body);
  const row = await db.mediaAsset.create({
    data: {
      id,
      storageKey,
      mimeType: input.mimeType,
      byteSize: input.body.byteLength,
      kind,
      createdById: input.actorId,
    },
    select: { id: true, storageKey: true, mimeType: true, byteSize: true },
  });
  return row;
}
