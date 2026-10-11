import type { Prisma, PublishStatus } from "@prisma/client";
import {
  assertTransitionPermission,
  changeDocument,
  stampOrThrow,
} from "@/modules/publishing/service";
import { canTransition, editableStatus, type StatusWrite } from "@/modules/publishing/workflow";
import { getExperience, getExperienceCategory } from "@/modules/experiences/repository";
import {
  experienceCategoryInput,
  experienceInput,
  type ExperienceCategoryInput,
  type ExperienceInput,
} from "@/modules/experiences/schemas";

function blank(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function permissionFor(next: PublishStatus): "catalog.write" | "catalog.publish" {
  return next === "IN_REVIEW" || next === "DRAFT" ? "catalog.write" : "catalog.publish";
}

async function transitionRecord(input: {
  actorId: string;
  next: PublishStatus;
  entityType: string;
  current: { id: string; status: PublishStatus; createdById: string | null };
  scheduledAt?: Date | null;
  dates?: {
    status: PublishStatus;
    publishedAt: Date | null;
    scheduledAt: Date | null;
    unpublishedAt: Date | null;
    archivedAt: Date | null;
  };
  beforePublish?: () => void;
  update: (
    tx: Prisma.TransactionClient,
    data: StatusWrite,
  ) => Promise<{ id: string; status: PublishStatus }>;
}): Promise<void> {
  if (input.next === "PUBLISHED") input.beforePublish?.();
  await assertTransitionPermission({
    actorId: input.actorId,
    next: input.next,
    domain: "catalog",
    createdById: input.current.createdById,
  });
  const data = input.dates
    ? { ...stampOrThrow(input.dates, input.next, input.scheduledAt), updatedById: input.actorId }
    : (() => {
        if (!canTransition(input.current.status, input.next)) {
          throw new Error(`Cannot move from ${input.current.status} to ${input.next}.`);
        }
        return { status: input.next, updatedById: input.actorId };
      })();
  await changeDocument({
    actorId: input.actorId,
    permission: permissionFor(input.next),
    entityType: input.entityType,
    action: "catalog.transition",
    mutate: async (tx) => {
      const row = await input.update(tx, data);
      return {
        id: row.id,
        before: { status: input.current.status },
        after: { status: row.status },
      };
    },
  });
}

export async function saveExperienceCategory(
  actorId: string,
  input: ExperienceCategoryInput,
  id?: string,
): Promise<string> {
  const parsed = experienceCategoryInput.parse(input);
  if (id) {
    const current = await getExperienceCategory(id);
    if (!current) throw new Error("That category was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
  }
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "experience_category",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = { ...parsed, updatedById: actorId };
      const row = id
        ? await tx.experienceCategory.update({ where: { id }, data })
        : await tx.experienceCategory.create({ data: { ...data, createdById: actorId } });
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionExperienceCategory(
  actorId: string,
  id: string,
  next: PublishStatus,
): Promise<void> {
  const current = await getExperienceCategory(id);
  if (!current) throw new Error("That category was not found.");
  await transitionRecord({
    actorId,
    next,
    entityType: "experience_category",
    current,
    update: (tx, data) =>
      tx.experienceCategory.update({
        where: { id },
        data: { status: data.status as PublishStatus, updatedById: actorId },
      }),
  });
}

export async function saveExperience(
  actorId: string,
  input: ExperienceInput,
  id?: string,
): Promise<string> {
  const parsed = experienceInput.parse(input);
  if (id) {
    const current = await getExperience(id);
    if (!current) throw new Error("That experience was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
  }
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "experience",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = {
        categoryId: parsed.categoryId,
        name: parsed.name,
        slug: parsed.slug,
        summary: parsed.summary,
        description: parsed.description,
        seasonality: blank(parsed.seasonality),
        seasonSourceNote: blank(parsed.seasonSourceNote),
        seasonReviewedAt: parsed.seasonReviewedAt ? new Date(parsed.seasonReviewedAt) : null,
        suitability: blank(parsed.suitability),
        durationGuidance: blank(parsed.durationGuidance),
        difficulty: blank(parsed.difficulty),
        safetyNotes: blank(parsed.safetyNotes),
        environmentalNotes: blank(parsed.environmentalNotes),
        seoTitle: blank(parsed.seoTitle),
        seoDescription: blank(parsed.seoDescription),
        updatedById: actorId,
      };
      const row = id
        ? await tx.experience.update({ where: { id }, data })
        : await tx.experience.create({ data: { ...data, createdById: actorId } });
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionExperience(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getExperience(id);
  if (!current) throw new Error("That experience was not found.");
  await transitionRecord({
    actorId,
    next,
    entityType: "experience",
    current,
    scheduledAt,
    dates: current,
    beforePublish: () => {
      if (!current.seoTitle || !current.seoDescription) {
        throw new Error("Enter the SEO title and description before publishing.");
      }
    },
    update: (tx, data) => tx.experience.update({ where: { id }, data }),
  });
}

export const moduleStatus = "implemented" as const;
