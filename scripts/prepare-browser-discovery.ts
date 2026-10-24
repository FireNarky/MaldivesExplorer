import { db } from "../src/lib/db";
import { saveResort, transitionResort } from "../src/modules/catalog/service";
import {
  saveArticle,
  saveCollection,
  saveContentCategory,
  saveExpert,
  saveFaq,
  transitionArticle,
  transitionCollection,
  transitionExpert,
  transitionFaq,
} from "../src/modules/content/service";
import {
  saveAtoll,
  saveIsland,
  transitionAtoll,
  transitionIsland,
} from "../src/modules/destinations/service";
import { saveExperience, transitionExperience } from "../src/modules/experiences/service";
import { TEST_FIXTURE_FAQ_QUESTIONS } from "../src/modules/discovery/visibility";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error(
      "Browser discovery setup refused a database that is not disposable maldives_stage1.",
    );
  }
}

async function publish(
  editorId: string,
  approverId: string,
  id: string,
  transition: (
    actorId: string,
    id: string,
    next: "IN_REVIEW" | "APPROVED" | "PUBLISHED",
  ) => Promise<void>,
): Promise<void> {
  await transition(editorId, id, "IN_REVIEW");
  await transition(approverId, id, "APPROVED");
  await transition(approverId, id, "PUBLISHED");
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const editor = await db.user.findUniqueOrThrow({
    where: { email: "browser-editor@example.com" },
  });
  const approver = await db.user.findUniqueOrThrow({
    where: { email: "browser-approver@example.com" },
  });
  const category = await db.experienceCategory.findFirstOrThrow({
    where: { status: "PUBLISHED" },
    select: { id: true },
  });

  const atollId = await saveAtoll(editor.id, {
    name: "Browser Atoll",
    slug: "browser-old",
    summary: "Browser geography.",
    description: "Browser geography.",
    seoTitle: "Browser Atoll",
    seoDescription: "Browser geography.",
  });
  await saveAtoll(
    editor.id,
    {
      name: "Browser Atoll",
      slug: "browser-atoll",
      summary: "Browser geography.",
      description: "Browser geography.",
      seoTitle: "Browser Atoll",
      seoDescription: "Browser geography.",
    },
    atollId,
  );
  await publish(editor.id, approver.id, atollId, transitionAtoll);

  const islandId = await saveIsland(editor.id, {
    atollId,
    islandType: "RESORT",
    name: "Browser Island",
    slug: "browser-island",
    summary: "Browser geography.",
    description: "Browser geography.",
    seoTitle: "Browser Island",
    seoDescription: "Browser geography.",
  });
  await publish(editor.id, approver.id, islandId, transitionIsland);

  const resortId = await saveResort(editor.id, {
    islandId,
    name: "Browser Resort",
    slug: "browser-resort",
    propertyType: "RESORT",
    summary: "Browser property.",
    description: "Browser property.",
    seoTitle: "Browser Resort",
    seoDescription: "Browser property.",
  });
  await publish(editor.id, approver.id, resortId, transitionResort);
  await saveResort(editor.id, {
    islandId,
    name: "browserdrafttoken",
    slug: "browser-draft-resort",
    propertyType: "RESORT",
    summary: "Draft property.",
    description: "Draft property.",
    seoTitle: "Draft property",
    seoDescription: "Draft property.",
  });

  const experienceId = await saveExperience(editor.id, {
    categoryId: category.id,
    name: "Browser Experience",
    slug: "browser-experience",
    summary: "Browser experience.",
    description: "Browser experience.",
    seoTitle: "Browser Experience",
    seoDescription: "Browser experience.",
  });
  await publish(editor.id, approver.id, experienceId, transitionExperience);
  await db.resortExperience.create({ data: { resortId, experienceId } });

  const contentCategoryId = await saveContentCategory(editor.id, {
    name: "Browser category",
    slug: "browser-category",
    description: "Browser category.",
    sortOrder: 0,
  });
  const authorId = await saveExpert(editor.id, {
    name: "Browser Author",
    slug: "browser-author",
    title: "Author",
    bio: "Browser author.",
  });
  const reviewerId = await saveExpert(editor.id, {
    name: "Browser Reviewer",
    slug: "browser-reviewer",
    title: "Reviewer",
    bio: "Browser reviewer.",
  });
  await publish(editor.id, approver.id, authorId, transitionExpert);

  const articleId = await saveArticle(editor.id, {
    title: "Browser Guide",
    slug: "browser-guide",
    excerpt: "Browser guide.",
    bodyText: "Browser guide text.",
    categoryId: contentCategoryId,
    authorId,
    reviewerId,
    reviewedAt: new Date().toISOString(),
    seoTitle: "Browser Guide",
    seoDescription: "Browser guide.",
    locale: "en",
  });
  await publish(editor.id, approver.id, articleId, transitionArticle);
  await db.contentRelation.create({
    data: { articleId, entityType: "RESORT", entityId: resortId, sortOrder: 0 },
  });

  const collectionId = await saveCollection(editor.id, {
    title: "Browser Collection",
    slug: "browser-collection",
    summary: "Browser collection.",
    bodyText: "Browser collection text.",
    seoTitle: "Browser Collection",
    seoDescription: "Browser collection.",
  });
  await db.collectionItem.create({
    data: { collectionId, entityType: "RESORT", entityId: resortId, sortOrder: 0 },
  });
  await publish(editor.id, approver.id, collectionId, transitionCollection);

  const faqId = await saveFaq(editor.id, {
    ownerType: "GLOBAL",
    // FAQs have no slug, so the public visibility policy identifies this fixture by its text.
    question: TEST_FIXTURE_FAQ_QUESTIONS[0],
    answer: "Browser answer.",
    sortOrder: 0,
  });
  await publish(editor.id, approver.id, faqId, transitionFaq);
  console.log("Disposable discovery records are ready.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Browser discovery setup failed.");
    await db.$disconnect();
    process.exit(1);
  });
