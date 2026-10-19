import type { Prisma, PublishStatus } from "@prisma/client";
import {
  assertTransitionPermission,
  changeDocument,
  stampOrThrow,
} from "@/modules/publishing/service";
import { canTransition, editableStatus, type StatusWrite } from "@/modules/publishing/workflow";
import { recordSlugRedirect } from "@/modules/redirects/service";
import {
  getArticle,
  getBlock,
  getCollection,
  getExpert,
  getFaq,
  getHomepageModule,
  getTag,
} from "@/modules/content/repository";
import {
  articleInput,
  blockInput,
  collectionInput,
  contentCategoryInput,
  expertInput,
  faqInput,
  homepageInput,
  tagInput,
  type ArticleInput,
  type BlockInput,
  type CollectionInput,
  type ContentCategoryInput,
  type ExpertInput,
  type FaqInput,
  type HomepageInput,
  type TagInput,
} from "@/modules/content/schemas";

function blank(value?: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function permissionFor(next: PublishStatus): "content.write" | "content.publish" {
  return next === "IN_REVIEW" || next === "DRAFT" ? "content.write" : "content.publish";
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
    domain: "content",
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
    action: "content.transition",
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

export async function saveContentCategory(
  actorId: string,
  input: ContentCategoryInput,
  id?: string,
): Promise<string> {
  const parsed = contentCategoryInput.parse(input);
  if (parsed.parentId && parsed.parentId === id)
    throw new Error("A category cannot parent itself.");
  return changeDocument({
    actorId,
    permission: "content.write",
    entityType: "content_category",
    action: id ? "content.update" : "content.create",
    mutate: async (tx) => {
      const data = {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description,
        parentId: blank(parsed.parentId),
        sortOrder: parsed.sortOrder,
        updatedById: actorId,
      };
      const row = id
        ? await tx.contentCategory.update({ where: { id }, data })
        : await tx.contentCategory.create({ data: { ...data, createdById: actorId } });
      return { id: row.id, after: { slug: row.slug } };
    },
  });
}

export async function saveTag(actorId: string, input: TagInput, id?: string): Promise<string> {
  const parsed = tagInput.parse(input);
  if (id && !(await getTag(id))) throw new Error("That tag was not found.");
  return changeDocument({
    actorId,
    permission: "content.write",
    entityType: "tag",
    action: id ? "content.update" : "content.create",
    mutate: async (tx) => {
      const row = id
        ? await tx.tag.update({ where: { id }, data: parsed })
        : await tx.tag.create({ data: parsed });
      return { id: row.id, after: { slug: row.slug } };
    },
  });
}

export async function saveExpert(
  actorId: string,
  input: ExpertInput,
  id?: string,
): Promise<string> {
  const parsed = expertInput.parse(input);
  if (id) {
    const current = await getExpert(id);
    if (!current) throw new Error("That author profile was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
  }
  return changeDocument({
    actorId,
    permission: "content.write",
    entityType: "expert_profile",
    action: id ? "content.update" : "content.create",
    mutate: async (tx) => {
      const data = { ...parsed, updatedById: actorId };
      const row = id
        ? await tx.expertProfile.update({ where: { id }, data })
        : await tx.expertProfile.create({ data: { ...data, createdById: actorId } });
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionExpert(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getExpert(id);
  if (!current) throw new Error("That author profile was not found.");
  await transitionRecord({
    actorId,
    next,
    entityType: "expert_profile",
    current,
    scheduledAt,
    dates: current,
    update: (tx, data) => tx.expertProfile.update({ where: { id }, data }),
  });
}

export async function saveArticle(
  actorId: string,
  input: ArticleInput,
  id?: string,
): Promise<string> {
  const parsed = articleInput.parse(input);
  if (parsed.reviewerId && parsed.reviewerId === parsed.authorId) {
    throw new Error("The reviewer must be a different author profile.");
  }
  let previousSlug: string | undefined;
  if (id) {
    const current = await getArticle(id);
    if (!current) throw new Error("That article was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
    previousSlug = current.slug;
  }
  return changeDocument({
    actorId,
    permission: "content.write",
    entityType: "article",
    action: id ? "content.update" : "content.create",
    mutate: async (tx) => {
      const data = {
        title: parsed.title,
        slug: parsed.slug,
        excerpt: parsed.excerpt,
        body: { blocks: [{ type: "RICH_TEXT", text: parsed.bodyText }] },
        bodyPlain: parsed.bodyText,
        categoryId: parsed.categoryId,
        authorId: parsed.authorId,
        reviewerId: blank(parsed.reviewerId),
        reviewedAt: parsed.reviewedAt ? new Date(parsed.reviewedAt) : null,
        seoTitle: blank(parsed.seoTitle),
        seoDescription: blank(parsed.seoDescription),
        locale: parsed.locale,
        updatedById: actorId,
      };
      const row = id
        ? await tx.article.update({ where: { id }, data: { ...data, revision: { increment: 1 } } })
        : await tx.article.create({ data: { ...data, createdById: actorId } });
      if (previousSlug && previousSlug !== row.slug) {
        await recordSlugRedirect(tx, `/guides/${previousSlug}`, `/guides/${row.slug}`);
      }
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionArticle(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getArticle(id);
  if (!current) throw new Error("That article was not found.");
  await transitionRecord({
    actorId,
    next,
    entityType: "article",
    current,
    scheduledAt,
    dates: current,
    beforePublish: () => {
      if (!current.seoTitle || !current.seoDescription) {
        throw new Error("Enter the SEO title and description before publishing.");
      }
      if (!current.reviewerId || !current.reviewedAt) {
        throw new Error("A different reviewer and review time are required before publishing.");
      }
    },
    update: (tx, data) => tx.article.update({ where: { id }, data }),
  });
}

export async function saveFaq(actorId: string, input: FaqInput, id?: string): Promise<string> {
  const parsed = faqInput.parse(input);
  const ownerId = blank(parsed.ownerId);
  if (parsed.ownerType === "GLOBAL" && ownerId) throw new Error("A global FAQ has no owner.");
  if (parsed.ownerType !== "GLOBAL" && !ownerId) throw new Error("Choose the owner.");
  if (id) {
    const current = await getFaq(id);
    if (!current) throw new Error("That FAQ was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
  }
  return changeDocument({
    actorId,
    permission: "content.write",
    entityType: "faq",
    action: id ? "content.update" : "content.create",
    mutate: async (tx) => {
      const data = {
        ownerType: parsed.ownerType,
        ownerId,
        question: parsed.question,
        answer: parsed.answer,
        sortOrder: parsed.sortOrder,
        updatedById: actorId,
      };
      const row = id
        ? await tx.faq.update({ where: { id }, data })
        : await tx.faq.create({ data: { ...data, createdById: actorId } });
      return { id: row.id, after: { status: row.status } };
    },
  });
}

export async function transitionFaq(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getFaq(id);
  if (!current) throw new Error("That FAQ was not found.");
  await transitionRecord({
    actorId,
    next,
    entityType: "faq",
    current,
    scheduledAt,
    dates: current,
    update: (tx, data) => tx.faq.update({ where: { id }, data }),
  });
}

export async function saveCollection(
  actorId: string,
  input: CollectionInput,
  id?: string,
): Promise<string> {
  const parsed = collectionInput.parse(input);
  let previousSlug: string | undefined;
  if (id) {
    const current = await getCollection(id);
    if (!current) throw new Error("That collection was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
    previousSlug = current.slug;
  }
  return changeDocument({
    actorId,
    permission: "content.write",
    entityType: "collection",
    action: id ? "content.update" : "content.create",
    mutate: async (tx) => {
      const data = {
        title: parsed.title,
        slug: parsed.slug,
        summary: parsed.summary,
        body: { text: parsed.bodyText ?? "" },
        seoTitle: blank(parsed.seoTitle),
        seoDescription: blank(parsed.seoDescription),
        updatedById: actorId,
      };
      const row = id
        ? await tx.collection.update({ where: { id }, data })
        : await tx.collection.create({ data: { ...data, createdById: actorId } });
      if (previousSlug && previousSlug !== row.slug) {
        await recordSlugRedirect(tx, `/collections/${previousSlug}`, `/collections/${row.slug}`);
      }
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionCollection(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getCollection(id);
  if (!current) throw new Error("That collection was not found.");
  await transitionRecord({
    actorId,
    next,
    entityType: "collection",
    current,
    scheduledAt,
    dates: current,
    beforePublish: () => {
      if (!current.seoTitle || !current.seoDescription) {
        throw new Error("Enter the SEO title and description before publishing.");
      }
    },
    update: (tx, data) => tx.collection.update({ where: { id }, data }),
  });
}

export async function saveHomepageModule(
  actorId: string,
  input: HomepageInput,
  id?: string,
): Promise<string> {
  const parsed = homepageInput.parse(input);
  if (id) {
    const current = await getHomepageModule(id);
    if (!current) throw new Error("That homepage module was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
  }
  return changeDocument({
    actorId,
    permission: "content.write",
    entityType: "homepage_module",
    action: id ? "content.update" : "content.create",
    mutate: async (tx) => {
      const data = {
        moduleType: parsed.moduleType,
        title: blank(parsed.title),
        config: parsed.text ? { text: parsed.text } : {},
        sortOrder: parsed.sortOrder,
        updatedById: actorId,
      };
      const row = id
        ? await tx.homepageModule.update({ where: { id }, data })
        : await tx.homepageModule.create({ data: { ...data, createdById: actorId } });
      return { id: row.id, after: { status: row.status, moduleType: row.moduleType } };
    },
  });
}

export async function transitionHomepageModule(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getHomepageModule(id);
  if (!current) throw new Error("That homepage module was not found.");
  await transitionRecord({
    actorId,
    next,
    entityType: "homepage_module",
    current,
    scheduledAt,
    dates: current,
    update: (tx, data) => tx.homepageModule.update({ where: { id }, data }),
  });
}

export async function saveBlock(actorId: string, input: BlockInput, id?: string): Promise<string> {
  const parsed = blockInput.parse(input);
  if (id) {
    const current = await getBlock(id);
    if (!current) throw new Error("That block was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
    if (current.code !== parsed.code) throw new Error("The code cannot change.");
  }
  return changeDocument({
    actorId,
    permission: "content.write",
    entityType: "reusable_block",
    action: id ? "content.update" : "content.create",
    mutate: async (tx) => {
      const data = {
        blockType: parsed.blockType,
        body: { text: parsed.bodyText },
        updatedById: actorId,
      };
      const row = id
        ? await tx.reusableBlock.update({ where: { id }, data })
        : await tx.reusableBlock.create({
            data: { ...data, code: parsed.code, createdById: actorId },
          });
      return { id: row.id, after: { code: row.code, status: row.status } };
    },
  });
}

export async function transitionBlock(
  actorId: string,
  id: string,
  next: PublishStatus,
): Promise<void> {
  const current = await getBlock(id);
  if (!current) throw new Error("That block was not found.");
  await transitionRecord({
    actorId,
    next,
    entityType: "reusable_block",
    current,
    update: (tx, data) =>
      tx.reusableBlock.update({
        where: { id },
        data: { status: data.status as PublishStatus, updatedById: actorId },
      }),
  });
}

export const moduleStatus = "implemented" as const;
