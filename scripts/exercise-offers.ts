import { db } from "../src/lib/db";
import { transitionResort } from "../src/modules/catalog";
import {
  saveOffer,
  transitionOffer,
  listPublicOffers,
  readPublicOffer,
} from "../src/modules/offers/service";

function assertDisposableDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for the offer exercise.");
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    name !== "maldives_stage1"
  ) {
    throw new Error("Offer exercise refused a database that is not disposable maldives_stage1.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  const editor = await db.user.findUniqueOrThrow({
    where: { email: "catalog-editor@example.com" },
  });
  const approver = await db.user.findUniqueOrThrow({
    where: { email: "catalog-approver@example.com" },
  });
  const resort = await db.resort.findUniqueOrThrow({ where: { slug: "exercise-resort" } });
  await transitionResort(approver.id, resort.id, "PUBLISHED");
  const occupancy = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "OCCUPANCY_BASIS", code: "DOUBLE", active: true },
  });
  const meal = await db.vocabularyItem.findFirstOrThrow({
    where: { set: "MEAL_PLAN", code: "HALF_BOARD", active: true },
  });
  const offerId = await saveOffer(editor.id, {
    resortId: resort.id,
    roomTypeId: "",
    title: "Exercise stay",
    slug: "exercise-stay",
    summary: "A published exercise offer.",
    currency: "USD",
    fromPrice: "100.00",
    occupancyBasisId: occupancy.id,
    mealPlanId: meal.id,
    transferIncluded: "true",
    validFrom: "2026-10-01",
    validUntil: "2026-12-31",
    stayFrom: "2026-11-01",
    stayUntil: "2026-11-30",
    minNights: "4",
    terms: "A consultant confirms the stay with the resort.",
    inclusions: "Speedboat\nBreakfast",
    exclusions: "Flights",
    seoTitle: "Exercise stay",
    seoDescription: "A published exercise offer.",
  });
  await transitionOffer(editor.id, offerId, "IN_REVIEW");
  await transitionOffer(approver.id, offerId, "APPROVED");
  await transitionOffer(approver.id, offerId, "PUBLISHED");
  const listed = await listPublicOffers();
  const current = listed.find((item) => item.slug === "exercise-stay");
  assert(current, "The valid published offer was not listed.");
  assert(!("fromPrice" in current), "The public offer list included a price.");
  assert(current.currency === "USD", "The public offer omitted the currency.");
  assert(current.inclusions.includes("Speedboat"), "The public offer omitted an inclusion.");
  const page = await readPublicOffer("exercise-stay");
  assert(page.state === "available", "The offer detail was not available.");
  if (page.state === "available") {
    assert(!("fromPrice" in page.offer), "The offer detail included a price.");
  }
  const expiredId = await saveOffer(editor.id, {
    resortId: resort.id,
    roomTypeId: "",
    title: "Expired exercise stay",
    slug: "expired-exercise-stay",
    summary: "An offer whose validity has passed.",
    currency: "USD",
    fromPrice: "80.00",
    occupancyBasisId: occupancy.id,
    mealPlanId: meal.id,
    transferIncluded: "false",
    validFrom: "2020-01-01",
    validUntil: "2020-01-31",
    stayFrom: "",
    stayUntil: "",
    minNights: "",
    terms: "This period has passed.",
    inclusions: "",
    exclusions: "",
    seoTitle: "",
    seoDescription: "",
  });
  await transitionOffer(editor.id, expiredId, "IN_REVIEW");
  await transitionOffer(approver.id, expiredId, "APPROVED");
  await transitionOffer(approver.id, expiredId, "PUBLISHED");
  assert(
    (await listPublicOffers()).every((item) => item.id !== expiredId),
    "An expired offer stayed on the list.",
  );
  const expired = await readPublicOffer("expired-exercise-stay");
  assert(expired.state === "expired", "An expired offer did not report that it is unavailable.");
  await transitionResort(approver.id, resort.id, "UNPUBLISHED");
  console.log("Offer exercise passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
