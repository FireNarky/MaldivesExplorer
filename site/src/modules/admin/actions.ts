"use server";

import { redirect } from "next/navigation";
import type { PublishStatus } from "@prisma/client";
import { auth } from "@/auth";
import { publishStatusSchema } from "@/modules/publishing/schemas";
import {
  saveAtoll,
  saveIsland,
  transitionAtoll,
  transitionIsland,
} from "@/modules/destinations/service";
import { atollInput, islandInput } from "@/modules/destinations/schemas";
import {
  linkResortAmenity,
  linkResortAudience,
  saveAmenity,
  saveAudience,
  saveDining,
  saveResort,
  saveRoom,
  saveTransfer,
  transitionDining,
  transitionResort,
  transitionRoom,
} from "@/modules/catalog/service";
import {
  amenityInput,
  audienceInput,
  diningInput,
  resortInput,
  roomInput,
  transferInput,
} from "@/modules/catalog/schemas";
import { offerInput } from "@/modules/offers/rules";
import { saveOffer, transitionOffer } from "@/modules/offers/service";
import {
  saveExperience,
  saveExperienceCategory,
  transitionExperience,
  transitionExperienceCategory,
} from "@/modules/experiences/service";
import { experienceCategoryInput, experienceInput } from "@/modules/experiences/schemas";
import {
  saveArticle,
  saveBlock,
  saveCollection,
  saveContentCategory,
  saveExpert,
  saveFaq,
  saveHomepageModule,
  saveTag,
  transitionArticle,
  transitionBlock,
  transitionCollection,
  transitionExpert,
  transitionFaq,
  transitionHomepageModule,
} from "@/modules/content/service";
import {
  articleInput,
  blockInput,
  collectionInput,
  contentCategoryInput,
  expertInput,
  faqInput,
  homepageInput,
  tagInput,
} from "@/modules/content/schemas";
import type { MediaOwnerType, MediaRole } from "@prisma/client";
import {
  linkMedia,
  storeMedia,
  transitionMedia,
  updateMediaDetails,
} from "@/modules/media/service";
import { errorMessage, field } from "@/modules/admin/form-data";

async function actorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  return session.user.id;
}

function scheduledAt(formData: FormData): Date | null {
  const value = field(formData, "scheduledAt");
  return value ? new Date(value) : null;
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function fail(path: string, error: unknown): never {
  if (isNextRedirect(error)) throw error;
  redirect(`${path}?error=${encodeURIComponent(errorMessage(error))}`);
}

export async function saveCatalogRecord(
  section: string,
  id: string,
  formData: FormData,
): Promise<void> {
  const userId = await actorId();
  const creating = id === "new";
  const path = `/admin/catalog/${section}/${id}`;
  try {
    const saved = await saveBySection(section, userId, formData, creating ? undefined : id);
    redirect(`/admin/catalog/${section}/${saved}`);
  } catch (error) {
    fail(path, error);
  }
}

export async function transitionCatalogRecord(
  section: string,
  id: string,
  formData: FormData,
): Promise<void> {
  const userId = await actorId();
  const next = publishStatusSchema.parse(field(formData, "status")) as PublishStatus;
  const when = scheduledAt(formData);
  const path = `/admin/catalog/${section}/${id}`;
  try {
    await transitionBySection(section, userId, id, next, when);
    redirect(path);
  } catch (error) {
    fail(path, error);
  }
}

export async function saveContentRecord(
  section: string,
  id: string,
  formData: FormData,
): Promise<void> {
  const userId = await actorId();
  const creating = id === "new";
  const path = `/admin/content/${section}/${id}`;
  try {
    const saved = await saveContentBySection(section, userId, formData, creating ? undefined : id);
    redirect(`/admin/content/${section}/${saved}`);
  } catch (error) {
    fail(path, error);
  }
}

export async function transitionContentRecord(
  section: string,
  id: string,
  formData: FormData,
): Promise<void> {
  const userId = await actorId();
  const next = publishStatusSchema.parse(field(formData, "status")) as PublishStatus;
  const when = scheduledAt(formData);
  const path = `/admin/content/${section}/${id}`;
  try {
    await transitionContentBySection(section, userId, id, next, when);
    redirect(path);
  } catch (error) {
    fail(path, error);
  }
}

export async function saveMediaRecord(id: string, formData: FormData): Promise<void> {
  const userId = await actorId();
  const path = `/admin/media/${id}`;
  try {
    await updateMediaDetails(userId, id, {
      altText: field(formData, "altText"),
      caption: field(formData, "caption"),
      attribution: field(formData, "attribution"),
    });
    const ownerId = field(formData, "ownerId");
    const ownerType = field(formData, "ownerType");
    const role = field(formData, "role");
    if (ownerId && ownerType && role) {
      await linkMedia(userId, {
        mediaId: id,
        ownerType: mediaOwner(ownerType),
        ownerId,
        role: mediaRole(role),
      });
    }
    redirect(path);
  } catch (error) {
    fail(path, error);
  }
}

export async function uploadMediaRecord(formData: FormData): Promise<void> {
  const userId = await actorId();
  const file = formData.get("file");
  if (!(file instanceof File)) fail("/admin/media", new Error("Choose a file."));
  try {
    const stored = await storeMedia({
      actorId: userId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      body: new Uint8Array(await file.arrayBuffer()),
    });
    redirect(`/admin/media/${stored.id}`);
  } catch (error) {
    fail("/admin/media", error);
  }
}

const mediaOwners = [
  "RESORT",
  "ROOM_TYPE",
  "DINING_VENUE",
  "ISLAND",
  "ATOLL",
  "EXPERIENCE",
  "ARTICLE",
  "COLLECTION",
] as const;
const mediaRoles = ["HERO", "GALLERY", "OG", "PORTRAIT", "ATTACHMENT"] as const;

function mediaOwner(value: string): MediaOwnerType {
  const found = mediaOwners.find((item) => item === value);
  if (!found) throw new Error("That owner cannot be linked in this stage.");
  return found;
}

function mediaRole(value: string): MediaRole {
  const found = mediaRoles.find((item) => item === value);
  if (!found) throw new Error("Choose a media role.");
  return found;
}

export async function transitionMediaRecord(id: string, formData: FormData): Promise<void> {
  const userId = await actorId();
  const path = `/admin/media/${id}`;
  try {
    await transitionMedia(userId, id, publishStatusSchema.parse(field(formData, "status")));
    redirect(path);
  } catch (error) {
    fail(path, error);
  }
}

async function saveBySection(
  section: string,
  userId: string,
  formData: FormData,
  id?: string,
): Promise<string> {
  const value = (name: string) => field(formData, name);
  switch (section) {
    case "atolls":
      return saveAtoll(
        userId,
        atollInput.parse({
          name: value("name"),
          slug: value("slug"),
          summary: value("summary"),
          description: value("description"),
          latitude: value("latitude"),
          longitude: value("longitude"),
          seoTitle: value("seoTitle"),
          seoDescription: value("seoDescription"),
        }),
        id,
      );
    case "islands":
      return saveIsland(
        userId,
        islandInput.parse({
          atollId: value("atollId"),
          islandType: value("islandType"),
          name: value("name"),
          slug: value("slug"),
          summary: value("summary"),
          description: value("description"),
          history: value("history"),
          cultureNotes: value("cultureNotes"),
          etiquette: value("etiquette"),
          latitude: value("latitude"),
          longitude: value("longitude"),
          seoTitle: value("seoTitle"),
          seoDescription: value("seoDescription"),
        }),
        id,
      );
    case "resorts": {
      const saved = await saveResort(
        userId,
        resortInput.parse({
          islandId: value("islandId"),
          name: value("name"),
          slug: value("slug"),
          propertyType: value("propertyType"),
          summary: value("summary"),
          description: value("description"),
          editorialPositioning: value("editorialPositioning"),
          priceBandId: value("priceBandId"),
          seoTitle: value("seoTitle"),
          seoDescription: value("seoDescription"),
          indicativeFromPrice: value("indicativeFromPrice"),
          indicativeCurrency: value("indicativeCurrency"),
          priceBasis: value("priceBasis"),
          priceIncludesTransfer: value("priceIncludesTransfer") as "" | "true" | "false",
          priceIncludesTax: value("priceIncludesTax") as "" | "true" | "false",
          priceSourceNote: value("priceSourceNote"),
          priceReviewedAt: value("priceReviewedAt"),
          hasHouseReef: value("hasHouseReef") as "" | "true" | "false",
          reefSummary: value("reefSummary"),
          diveCenterSummary: value("diveCenterSummary"),
          reefSourceNote: value("reefSourceNote"),
          reefReviewedAt: value("reefReviewedAt"),
          starCategory: value("starCategory"),
          starCategorySource: value("starCategorySource"),
          checkInNotes: value("checkInNotes"),
        }),
        id,
      );
      if (value("amenityId")) await linkResortAmenity(userId, saved, value("amenityId"));
      if (value("audienceTagId")) await linkResortAudience(userId, saved, value("audienceTagId"));
      return saved;
    }
    case "rooms":
      return saveRoom(
        userId,
        roomInput.parse({
          resortId: value("resortId"),
          categoryId: value("categoryId"),
          name: value("name"),
          slug: value("slug"),
          description: value("description"),
          maxAdults: value("maxAdults"),
          maxChildren: value("maxChildren") || "0",
        }),
        id,
      );
    case "dining":
      return saveDining(
        userId,
        diningInput.parse({
          resortId: value("resortId"),
          venueTypeId: value("venueTypeId"),
          name: value("name"),
          description: value("description"),
          cuisine: value("cuisine"),
        }),
        id,
      );
    case "transfers":
      return saveTransfer(
        userId,
        transferInput.parse({
          resortId: value("resortId"),
          transferTypeId: value("transferTypeId"),
          label: value("label"),
          durationMinutes: value("durationMinutes"),
          sourceNote: value("sourceNote"),
          notes: value("notes"),
        }),
        id,
      );
    case "amenities":
      return saveAmenity(
        userId,
        amenityInput.parse({
          code: value("code"),
          name: value("name"),
          category: value("category"),
          description: value("description"),
        }),
        id,
      );
    case "audiences":
      return saveAudience(
        userId,
        audienceInput.parse({ code: value("code"), name: value("name") }),
        id,
      );
    case "experience-categories":
      return saveExperienceCategory(
        userId,
        experienceCategoryInput.parse({
          name: value("name"),
          slug: value("slug"),
          description: value("description"),
          sortOrder: value("sortOrder") || "0",
        }),
        id,
      );
    case "experiences":
      return saveExperience(
        userId,
        experienceInput.parse({
          categoryId: value("categoryId"),
          name: value("name"),
          slug: value("slug"),
          summary: value("summary"),
          description: value("description"),
          seasonality: value("seasonality"),
          seasonSourceNote: value("seasonSourceNote"),
          seasonReviewedAt: value("seasonReviewedAt"),
          suitability: value("suitability"),
          durationGuidance: value("durationGuidance"),
          difficulty: value("difficulty"),
          safetyNotes: value("safetyNotes"),
          environmentalNotes: value("environmentalNotes"),
          seoTitle: value("seoTitle"),
          seoDescription: value("seoDescription"),
        }),
        id,
      );
    case "offers":
      return saveOffer(
        userId,
        offerInput.parse({
          resortId: value("resortId"),
          roomTypeId: value("roomTypeId"),
          title: value("title"),
          slug: value("slug"),
          summary: value("summary"),
          currency: value("currency"),
          fromPrice: value("fromPrice"),
          occupancyBasisId: value("occupancyBasisId"),
          mealPlanId: value("mealPlanId"),
          transferIncluded: value("transferIncluded"),
          validFrom: value("validFrom"),
          validUntil: value("validUntil"),
          stayFrom: value("stayFrom"),
          stayUntil: value("stayUntil"),
          minNights: value("minNights"),
          terms: value("terms"),
          inclusions: value("inclusions"),
          exclusions: value("exclusions"),
          seoTitle: value("seoTitle"),
          seoDescription: value("seoDescription"),
        }),
        id,
      );
    default:
      throw new Error("That catalog section is not available.");
  }
}

async function transitionBySection(
  section: string,
  userId: string,
  id: string,
  next: PublishStatus,
  when: Date | null,
): Promise<void> {
  switch (section) {
    case "atolls":
      return transitionAtoll(userId, id, next, when);
    case "islands":
      return transitionIsland(userId, id, next, when);
    case "resorts":
      return transitionResort(userId, id, next, when);
    case "rooms":
      return transitionRoom(userId, id, next);
    case "dining":
      return transitionDining(userId, id, next);
    case "experience-categories":
      return transitionExperienceCategory(userId, id, next);
    case "experiences":
      return transitionExperience(userId, id, next, when);
    case "offers":
      return transitionOffer(userId, id, next, when);
    default:
      throw new Error("This record has no publication status.");
  }
}

async function saveContentBySection(
  section: string,
  userId: string,
  formData: FormData,
  id?: string,
): Promise<string> {
  const value = (name: string) => field(formData, name);
  switch (section) {
    case "categories":
      return saveContentCategory(
        userId,
        contentCategoryInput.parse({
          name: value("name"),
          slug: value("slug"),
          description: value("description"),
          parentId: value("parentId"),
          sortOrder: value("sortOrder") || "0",
        }),
        id,
      );
    case "tags":
      return saveTag(userId, tagInput.parse({ name: value("name"), slug: value("slug") }), id);
    case "authors":
      return saveExpert(
        userId,
        expertInput.parse({
          name: value("name"),
          slug: value("slug"),
          title: value("title"),
          bio: value("bio"),
        }),
        id,
      );
    case "articles":
      return saveArticle(
        userId,
        articleInput.parse({
          title: value("title"),
          slug: value("slug"),
          excerpt: value("excerpt"),
          bodyText: value("bodyText"),
          categoryId: value("categoryId"),
          authorId: value("authorId"),
          reviewerId: value("reviewerId"),
          reviewedAt: value("reviewedAt"),
          seoTitle: value("seoTitle"),
          seoDescription: value("seoDescription"),
          locale: value("locale") || "en",
        }),
        id,
      );
    case "faqs":
      return saveFaq(
        userId,
        faqInput.parse({
          ownerType: value("ownerType"),
          ownerId: value("ownerId"),
          question: value("question"),
          answer: value("answer"),
          sortOrder: value("sortOrder") || "0",
        }),
        id,
      );
    case "collections":
      return saveCollection(
        userId,
        collectionInput.parse({
          title: value("title"),
          slug: value("slug"),
          summary: value("summary"),
          bodyText: value("bodyText"),
          seoTitle: value("seoTitle"),
          seoDescription: value("seoDescription"),
        }),
        id,
      );
    case "homepage":
      return saveHomepageModule(
        userId,
        homepageInput.parse({
          moduleType: value("moduleType"),
          title: value("title"),
          text: value("text"),
          sortOrder: value("sortOrder") || "0",
        }),
        id,
      );
    case "blocks":
      return saveBlock(
        userId,
        blockInput.parse({
          code: value("code"),
          blockType: value("blockType"),
          bodyText: value("bodyText"),
        }),
        id,
      );
    default:
      throw new Error("That content section is not available.");
  }
}

async function transitionContentBySection(
  section: string,
  userId: string,
  id: string,
  next: PublishStatus,
  when: Date | null,
): Promise<void> {
  switch (section) {
    case "authors":
      return transitionExpert(userId, id, next, when);
    case "articles":
      return transitionArticle(userId, id, next, when);
    case "faqs":
      return transitionFaq(userId, id, next, when);
    case "collections":
      return transitionCollection(userId, id, next, when);
    case "homepage":
      return transitionHomepageModule(userId, id, next, when);
    case "blocks":
      return transitionBlock(userId, id, next);
    default:
      throw new Error("This record has no publication status.");
  }
}
