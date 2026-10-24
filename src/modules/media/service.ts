import { randomUUID } from "node:crypto";
import type { MediaKind, MediaOwnerType, MediaRole, PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/modules/audit/service";
import { userHasPermission } from "@/modules/identity/service";
import { assertTransitionPermission, changeDocument } from "@/modules/publishing/service";
import { canTransition } from "@/modules/publishing/workflow";
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
  await db.$transaction(async (tx) => {
    await tx.mediaAsset.create({
      data: {
        id,
        storageKey,
        mimeType: input.mimeType,
        byteSize: input.body.byteLength,
        kind,
        createdById: input.actorId,
      },
    });
    await writeAudit(
      {
        actorId: input.actorId,
        action: "media.create",
        entityType: "media_asset",
        entityId: id,
        after: { mimeType: input.mimeType, byteSize: input.body.byteLength, kind },
      },
      tx,
    );
  });
  return { id, storageKey, mimeType: input.mimeType, byteSize: input.body.byteLength };
}

export function listMedia() {
  return db.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, mimeType: true, kind: true, status: true, altText: true, byteSize: true },
  });
}

export function getMedia(id: string) {
  return db.mediaAsset.findUnique({ where: { id } });
}

export async function updateMediaDetails(
  actorId: string,
  id: string,
  input: { altText?: string; caption?: string; attribution?: string },
): Promise<void> {
  const current = await getMedia(id);
  if (!current) throw new Error("That file was not found.");
  if (current.status === "PUBLISHED" || current.status === "ARCHIVED") {
    throw new Error("Unpublish this record before editing.");
  }
  await changeDocument({
    actorId,
    permission: "media.write",
    entityType: "media_asset",
    action: "media.update",
    mutate: async (tx) => {
      await tx.mediaAsset.update({
        where: { id },
        data: {
          altText: input.altText?.trim() || null,
          caption: input.caption?.trim() || null,
          attribution: input.attribution?.trim() || null,
        },
      });
      return { id, after: { altText: input.altText ?? null } };
    },
  });
}

export async function transitionMedia(
  actorId: string,
  id: string,
  next: PublishStatus,
): Promise<void> {
  const current = await getMedia(id);
  if (!current) throw new Error("That file was not found.");
  if (next === "PUBLISHED") {
    const image = current.kind === "IMAGE" || current.kind === "DRONE";
    if (image && !current.altText) throw new Error("Enter alt text before publishing an image.");
    if (current.kind === "VIDEO" && !current.caption && !current.transcript) {
      throw new Error("Enter a caption or transcript before publishing a video.");
    }
  }
  if (!canTransition(current.status, next)) {
    throw new Error(`Cannot move from ${current.status} to ${next}.`);
  }
  await assertTransitionPermission({
    actorId,
    next,
    domain: "media",
    createdById: current.createdById,
  });
  await changeDocument({
    actorId,
    permission: "media.write",
    entityType: "media_asset",
    action: "media.transition",
    mutate: async (tx) => {
      const row = await tx.mediaAsset.update({ where: { id }, data: { status: next } });
      return { id: row.id, before: { status: current.status }, after: { status: row.status } };
    },
  });
}

const linkableOwners = new Set<MediaOwnerType>([
  "RESORT",
  "ROOM_TYPE",
  "DINING_VENUE",
  "ISLAND",
  "ATOLL",
  "EXPERIENCE",
  "ARTICLE",
  "COLLECTION",
]);

export async function linkMedia(
  actorId: string,
  input: { mediaId: string; ownerType: MediaOwnerType; ownerId: string; role: MediaRole },
): Promise<void> {
  if (!linkableOwners.has(input.ownerType)) {
    throw new Error("That owner cannot be linked in this stage.");
  }
  await changeDocument({
    actorId,
    permission: "media.write",
    entityType: "media_link",
    action: "media.link",
    mutate: async (tx) => {
      const row = await tx.mediaLink.create({ data: input });
      return {
        id: row.id,
        after: { mediaId: input.mediaId, ownerType: input.ownerType, ownerId: input.ownerId },
      };
    },
  });
}

export async function readPublishedMedia(
  id: string,
): Promise<{ storageKey: string; mimeType: string; updatedAt: Date; byteSize: number } | null> {
  const row = await db.mediaAsset.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { storageKey: true, mimeType: true, updatedAt: true, byteSize: true },
  });
  return row;
}
