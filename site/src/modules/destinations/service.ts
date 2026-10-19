import type { PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  assertTransitionPermission,
  changeDocument,
  stampOrThrow,
} from "@/modules/publishing/service";
import { editableStatus } from "@/modules/publishing/workflow";
import { getAtoll, getIsland } from "@/modules/destinations/repository";
import { recordSlugRedirect } from "@/modules/redirects/service";
import {
  atollInput,
  coordinatePair,
  islandInput,
  type AtollInput,
  type IslandInput,
} from "@/modules/destinations/schemas";

function emptyToNull(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function datesOf(record: {
  status: PublishStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  unpublishedAt: Date | null;
  archivedAt: Date | null;
}) {
  return {
    status: record.status,
    publishedAt: record.publishedAt,
    scheduledAt: record.scheduledAt,
    unpublishedAt: record.unpublishedAt,
    archivedAt: record.archivedAt,
  };
}

export async function saveAtoll(actorId: string, input: AtollInput, id?: string): Promise<string> {
  const parsed = atollInput.parse(input);
  const coordinates = coordinatePair(parsed.latitude, parsed.longitude);
  let previousSlug: string | undefined;
  if (id) {
    const current = await getAtoll(id);
    if (!current) throw new Error("That atoll was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
    previousSlug = current.slug;
  }
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "atoll",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = {
        name: parsed.name,
        slug: parsed.slug,
        summary: parsed.summary,
        description: parsed.description,
        latitude: coordinates.latitude ?? null,
        longitude: coordinates.longitude ?? null,
        seoTitle: emptyToNull(parsed.seoTitle),
        seoDescription: emptyToNull(parsed.seoDescription),
        updatedById: actorId,
      };
      const row = id
        ? await tx.atoll.update({ where: { id }, data })
        : await tx.atoll.create({ data: { ...data, createdById: actorId } });
      if (previousSlug && previousSlug !== row.slug) {
        await recordSlugRedirect(tx, `/atolls/${previousSlug}`, `/atolls/${row.slug}`);
      }
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionAtoll(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getAtoll(id);
  if (!current) throw new Error("That atoll was not found.");
  if (next === "PUBLISHED" && (!current.seoTitle || !current.seoDescription)) {
    throw new Error("Enter the SEO title and description before publishing.");
  }
  await assertTransitionPermission({
    actorId,
    next,
    domain: "catalog",
    createdById: current.createdById,
  });
  const stamp = stampOrThrow(datesOf(current), next, scheduledAt);
  await changeDocument({
    actorId,
    permission: next === "IN_REVIEW" || next === "DRAFT" ? "catalog.write" : "catalog.publish",
    entityType: "atoll",
    action: "catalog.transition",
    mutate: async (tx) => {
      const row = await tx.atoll.update({
        where: { id },
        data: { ...stamp, updatedById: actorId },
      });
      return { id: row.id, before: { status: current.status }, after: { status: row.status } };
    },
  });
}

export async function saveIsland(
  actorId: string,
  input: IslandInput,
  id?: string,
): Promise<string> {
  const parsed = islandInput.parse(input);
  const coordinates = coordinatePair(parsed.latitude, parsed.longitude);
  let previousSlug: string | undefined;
  if (id) {
    const current = await getIsland(id);
    if (!current) throw new Error("That island was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
    previousSlug = current.slug;
  }
  const atoll = await db.atoll.findUnique({ where: { id: parsed.atollId }, select: { id: true } });
  if (!atoll) throw new Error("Choose an atoll.");
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "island",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = {
        atollId: parsed.atollId,
        name: parsed.name,
        slug: parsed.slug,
        islandType: parsed.islandType,
        summary: parsed.summary,
        description: parsed.description,
        history: emptyToNull(parsed.history),
        cultureNotes: emptyToNull(parsed.cultureNotes),
        etiquette: emptyToNull(parsed.etiquette),
        latitude: coordinates.latitude ?? null,
        longitude: coordinates.longitude ?? null,
        seoTitle: emptyToNull(parsed.seoTitle),
        seoDescription: emptyToNull(parsed.seoDescription),
        updatedById: actorId,
      };
      const row = id
        ? await tx.island.update({ where: { id }, data })
        : await tx.island.create({ data: { ...data, createdById: actorId } });
      if (previousSlug && previousSlug !== row.slug) {
        await recordSlugRedirect(tx, `/islands/${previousSlug}`, `/islands/${row.slug}`);
      }
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionIsland(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getIsland(id);
  if (!current) throw new Error("That island was not found.");
  if (next === "PUBLISHED" && (!current.seoTitle || !current.seoDescription)) {
    throw new Error("Enter the SEO title and description before publishing.");
  }
  await assertTransitionPermission({
    actorId,
    next,
    domain: "catalog",
    createdById: current.createdById,
  });
  const stamp = stampOrThrow(datesOf(current), next, scheduledAt);
  await changeDocument({
    actorId,
    permission: next === "IN_REVIEW" || next === "DRAFT" ? "catalog.write" : "catalog.publish",
    entityType: "island",
    action: "catalog.transition",
    mutate: async (tx) => {
      const row = await tx.island.update({
        where: { id },
        data: { ...stamp, updatedById: actorId },
      });
      return { id: row.id, before: { status: current.status }, after: { status: row.status } };
    },
  });
}

export const moduleStatus = "implemented" as const;
