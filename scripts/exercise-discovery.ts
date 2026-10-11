import { db } from "../src/lib/db";
import { saveResort } from "../src/modules/catalog/service";
import { saveFaq, transitionFaq } from "../src/modules/content/service";
import { saveAtoll } from "../src/modules/destinations/service";
import { getPublishedAtoll, listGlobalFaqs, listSitemapEntries } from "../src/modules/discovery";
import { findActiveRedirect } from "../src/modules/redirects/service";
import { searchPublished, suggestPublished, writeSearchEvent } from "../src/modules/search/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the discovery exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error(
      "Discovery exercise refused a database that is not disposable maldives_stage1.",
    );
  }
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const editor = await db.user.findUniqueOrThrow({
    where: { email: "catalog-editor@example.com" },
  });
  const approver = await db.user.findUniqueOrThrow({
    where: { email: "catalog-approver@example.com" },
  });
  const island = await db.island.findUniqueOrThrow({ where: { slug: "exercise-island" } });

  await saveResort(editor.id, {
    islandId: island.id,
    name: "draftonlytoken",
    slug: "draft-only-token",
    propertyType: "RESORT",
    summary: "Draft search row.",
    description: "Draft search row.",
    seoTitle: "Draft search row",
    seoDescription: "Draft search row.",
  });

  const publishedHits = await searchPublished("Exercise atoll", "atolls");
  if (!publishedHits.some((hit) => hit.href === "/atolls/exercise-atoll")) {
    throw new Error("Published full-text search missed the exercise atoll.");
  }
  const draftHits = await searchPublished("draftonlytoken", "all");
  if (draftHits.length !== 0) throw new Error("Search returned a draft resort.");

  const suggestions = await suggestPublished("Exercise atoll");
  if (!suggestions.some((item) => item.href === "/atolls/exercise-atoll")) {
    throw new Error("Suggestions missed the published atoll.");
  }
  const draftSuggestions = await suggestPublished("draftonlytoken");
  if (draftSuggestions.length !== 0) throw new Error("Suggestions returned a draft resort.");

  const renamedId = await saveAtoll(editor.id, {
    name: "Discovery atoll",
    slug: "discovery-old",
    summary: "Discovery geography.",
    description: "Discovery geography.",
    seoTitle: "Discovery atoll",
    seoDescription: "Discovery geography.",
  });
  await saveAtoll(
    editor.id,
    {
      name: "Discovery atoll",
      slug: "discovery-new",
      summary: "Discovery geography.",
      description: "Discovery geography.",
      seoTitle: "Discovery atoll",
      seoDescription: "Discovery geography.",
    },
    renamedId,
  );
  const redirect = await findActiveRedirect("/atolls/discovery-old");
  if (!redirect || redirect.toPath !== "/atolls/discovery-new" || redirect.statusCode !== 301) {
    throw new Error("The slug change did not store a redirect.");
  }
  if (await findActiveRedirect("/admin/catalog")) {
    throw new Error("A staff path was treated as a public redirect.");
  }
  if (await getPublishedAtoll("discovery-new")) {
    throw new Error("A draft atoll was returned on the public page.");
  }

  const before = await db.analyticsEvent.count();
  const denied = await writeSearchEvent({
    query: "discovery-secret",
    resultCount: 1,
    consent: "DENIED",
  });
  const unknown = await writeSearchEvent({
    query: "discovery-secret",
    resultCount: 1,
    consent: "UNKNOWN",
  });
  if (denied || unknown || (await db.analyticsEvent.count()) !== before) {
    throw new Error("Search analytics was stored without consent.");
  }
  const granted = await writeSearchEvent({
    query: "discovery-secret",
    resultCount: 1,
    consent: "GRANTED",
    anonymousKey: "discovery-exercise",
  });
  if (!granted || (await db.analyticsEvent.count()) !== before + 1) {
    throw new Error("Granted search analytics was not stored.");
  }

  const faqId = await saveFaq(editor.id, {
    ownerType: "GLOBAL",
    question: "Discovery question",
    answer: "Discovery answer",
    sortOrder: 1,
  });
  await saveFaq(editor.id, {
    ownerType: "GLOBAL",
    question: "Hidden draft question",
    answer: "Hidden draft answer",
    sortOrder: 2,
  });
  await transitionFaq(editor.id, faqId, "IN_REVIEW");
  await transitionFaq(approver.id, faqId, "APPROVED");
  await transitionFaq(approver.id, faqId, "PUBLISHED");
  const faqs = await listGlobalFaqs();
  if (!faqs.some((item) => item.question === "Discovery question")) {
    throw new Error("The published question was not public.");
  }
  if (faqs.some((item) => item.question === "Hidden draft question")) {
    throw new Error("A draft question was public.");
  }

  const entries = await listSitemapEntries();
  const paths = new Set(entries.map((entry) => entry.path));
  if (!paths.has("/atolls/exercise-atoll") || !paths.has("/faq") || !paths.has("/search")) {
    throw new Error("The sitemap missed a published path.");
  }
  if (paths.has("/resorts/draft-only-token") || paths.has("/atolls/discovery-new")) {
    throw new Error("The sitemap included a draft path.");
  }
  console.log("Discovery exercise passed.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Discovery exercise failed.");
    await db.$disconnect();
    process.exitCode = 1;
  });
