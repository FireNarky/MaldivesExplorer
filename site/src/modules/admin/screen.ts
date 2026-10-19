import type { PublishStatus } from "@prisma/client";
import { permissionsForUser } from "@/modules/identity/service";
import { nextPublishStatuses } from "@/modules/publishing/workflow";
import { canTransitionWith } from "@/modules/publishing/policies";
import {
  listAtollOptions,
  listAtolls,
  getAtoll,
  listIslands,
  getIsland,
} from "@/modules/destinations";
import {
  getAmenity,
  getAudience,
  getDining,
  getResort,
  getRoom,
  getTransfer,
  listAmenities,
  listAudiences,
  listDining,
  listIslandOptions,
  listResortOptions,
  listResorts,
  listRooms,
  listTransfers,
  listVocabulary,
} from "@/modules/catalog";
import { getOffer, listOffers } from "@/modules/offers/service";
import { formatDateOnly } from "@/modules/offers/rules";
import {
  getExperience,
  getExperienceCategory,
  listExperienceCategories,
  listExperienceCategoryOptions,
  listExperiences,
} from "@/modules/experiences";
import {
  getArticle,
  getBlock,
  getCollection,
  getContentCategory,
  getExpert,
  getFaq,
  getHomepageModule,
  getTag,
  listArticles,
  listBlocks,
  listCollections,
  listContentCategories,
  listExperts,
  listFaqs,
  listHomepageModules,
  listTags,
} from "@/modules/content";
import { getMedia } from "@/modules/media";
import type { EditorField } from "@/components/admin/editor-form";

export type ListRow = { id: string; label: string; status?: string; meta?: string };

const text = (name: string, label: string, value = "", required = false): EditorField => ({
  name,
  label,
  value,
  required,
});
const area = (name: string, label: string, value = "", required = false): EditorField => ({
  name,
  label,
  value,
  type: "textarea",
  required,
});
const choice = (
  name: string,
  label: string,
  value: string,
  options: Array<{ value: string; label: string }>,
  required = false,
): EditorField => ({ name, label, value, type: "select", options, required });

function dateValue(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 16);
}

function decimalValue(value: { toString(): string } | null | undefined): string {
  return value ? value.toString() : "";
}

export async function catalogRows(section: string): Promise<ListRow[]> {
  switch (section) {
    case "atolls":
      return (await listAtolls()).map((row) => ({
        id: row.id,
        label: row.name,
        status: row.status,
      }));
    case "islands":
      return (await listIslands()).map((row) => ({
        id: row.id,
        label: row.name,
        status: row.status,
        meta: row.atoll.name,
      }));
    case "resorts":
      return (await listResorts()).map((row) => ({
        id: row.id,
        label: row.name,
        status: row.status,
      }));
    case "rooms":
      return (await listRooms()).map((row) => ({
        id: row.id,
        label: row.name,
        status: row.status,
        meta: row.resort.name,
      }));
    case "dining":
      return (await listDining()).map((row) => ({
        id: row.id,
        label: row.name,
        status: row.status,
        meta: row.resort.name,
      }));
    case "transfers":
      return (await listTransfers()).map((row) => ({
        id: row.id,
        label: row.label,
        meta: row.resort.name,
      }));
    case "amenities":
      return (await listAmenities()).map((row) => ({
        id: row.id,
        label: row.name,
        meta: row.code,
      }));
    case "audiences":
      return (await listAudiences()).map((row) => ({
        id: row.id,
        label: row.name,
        meta: row.code,
      }));
    case "experience-categories":
      return (await listExperienceCategories()).map((row) => ({
        id: row.id,
        label: row.name,
        status: row.status,
      }));
    case "experiences":
      return (await listExperiences()).map((row) => ({
        id: row.id,
        label: row.name,
        status: row.status,
        meta: row.category.name,
      }));
    case "offers":
      return (await listOffers()).map((row) => ({
        id: row.id,
        label: row.title,
        status: row.status,
        meta: row.resort.name,
      }));
    default:
      return [];
  }
}

export async function contentRows(section: string): Promise<ListRow[]> {
  switch (section) {
    case "categories":
      return (await listContentCategories()).map((row) => ({
        id: row.id,
        label: row.name,
        meta: row.slug,
      }));
    case "tags":
      return (await listTags()).map((row) => ({ id: row.id, label: row.name, meta: row.slug }));
    case "authors":
      return (await listExperts()).map((row) => ({
        id: row.id,
        label: row.name,
        status: row.status,
      }));
    case "articles":
      return (await listArticles()).map((row) => ({
        id: row.id,
        label: row.title,
        status: row.status,
      }));
    case "faqs":
      return (await listFaqs()).map((row) => ({
        id: row.id,
        label: row.question,
        status: row.status,
        meta: row.ownerType,
      }));
    case "collections":
      return (await listCollections()).map((row) => ({
        id: row.id,
        label: row.title,
        status: row.status,
      }));
    case "homepage":
      return (await listHomepageModules()).map((row) => ({
        id: row.id,
        label: row.title ?? row.moduleType,
        status: row.status,
      }));
    case "blocks":
      return (await listBlocks()).map((row) => ({
        id: row.id,
        label: row.code,
        status: row.status,
        meta: row.blockType,
      }));
    default:
      return [];
  }
}

export async function catalogFields(
  section: string,
  id: string,
): Promise<{ fields: EditorField[]; status?: PublishStatus }> {
  if (id === "new") return { fields: await blankCatalogFields(section) };
  switch (section) {
    case "atolls": {
      const row = await getAtoll(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: [
          text("name", "Name", row.name, true),
          text("slug", "Slug", row.slug, true),
          area("summary", "Summary", row.summary, true),
          area("description", "Description", row.description, true),
          text("latitude", "Latitude", decimalValue(row.latitude)),
          text("longitude", "Longitude", decimalValue(row.longitude)),
          text("seoTitle", "SEO title", row.seoTitle ?? ""),
          area("seoDescription", "SEO description", row.seoDescription ?? ""),
        ],
      };
    }
    case "islands": {
      const row = await getIsland(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: [
          choice("atollId", "Atoll", row.atollId, await options(listAtollOptions), true),
          choice(
            "islandType",
            "Island type",
            row.islandType,
            enumOptions(["RESORT", "LOCAL", "UNINHABITED"]),
            true,
          ),
          text("name", "Name", row.name, true),
          text("slug", "Slug", row.slug, true),
          area("summary", "Summary", row.summary, true),
          area("description", "Description", row.description, true),
          area("history", "History", row.history ?? ""),
          area("cultureNotes", "Culture notes", row.cultureNotes ?? ""),
          area("etiquette", "Etiquette", row.etiquette ?? ""),
          text("latitude", "Latitude", decimalValue(row.latitude)),
          text("longitude", "Longitude", decimalValue(row.longitude)),
          text("seoTitle", "SEO title", row.seoTitle ?? ""),
          area("seoDescription", "SEO description", row.seoDescription ?? ""),
        ],
      };
    }
    case "resorts": {
      const row = await getResort(id);
      if (!row) return { fields: [] };
      return { status: row.status, fields: await resortFields(row) };
    }
    case "rooms": {
      const row = await getRoom(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: [
          choice("resortId", "Resort", row.resortId, await options(listResortOptions), true),
          choice(
            "categoryId",
            "Category",
            row.categoryId,
            await options(listVocabulary.bind(null, "ROOM_CATEGORY")),
            true,
          ),
          text("name", "Name", row.name, true),
          text("slug", "Slug", row.slug, true),
          area("description", "Description", row.description, true),
          {
            name: "maxAdults",
            label: "Maximum adults",
            value: String(row.maxAdults),
            type: "number",
            required: true,
          },
          {
            name: "maxChildren",
            label: "Maximum children",
            value: String(row.maxChildren),
            type: "number",
          },
        ],
      };
    }
    case "dining": {
      const row = await getDining(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: [
          choice("resortId", "Resort", row.resortId, await options(listResortOptions), true),
          choice(
            "venueTypeId",
            "Venue type",
            row.venueTypeId,
            await options(listVocabulary.bind(null, "VENUE_TYPE")),
            true,
          ),
          text("name", "Name", row.name, true),
          area("description", "Description", row.description, true),
          text("cuisine", "Cuisine", row.cuisine ?? ""),
        ],
      };
    }
    case "transfers": {
      const row = await getTransfer(id);
      if (!row) return { fields: [] };
      return {
        fields: [
          choice("resortId", "Resort", row.resortId, await options(listResortOptions), true),
          choice(
            "transferTypeId",
            "Transfer type",
            row.transferTypeId,
            await options(listVocabulary.bind(null, "TRANSFER_TYPE")),
            true,
          ),
          text("label", "Label", row.label, true),
          text(
            "durationMinutes",
            "Duration minutes",
            row.durationMinutes ? String(row.durationMinutes) : "",
          ),
          text("sourceNote", "Source note", row.sourceNote ?? ""),
          area("notes", "Notes", row.notes ?? ""),
        ],
      };
    }
    case "amenities": {
      const row = await getAmenity(id);
      if (!row) return { fields: [] };
      return {
        fields: [
          text("code", "Code", row.code, true),
          text("name", "Name", row.name, true),
          text("category", "Category", row.category, true),
          area("description", "Description", row.description ?? ""),
        ],
      };
    }
    case "audiences": {
      const row = await getAudience(id);
      if (!row) return { fields: [] };
      return {
        fields: [text("code", "Code", row.code, true), text("name", "Name", row.name, true)],
      };
    }
    case "experience-categories": {
      const row = await getExperienceCategory(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: [
          text("name", "Name", row.name, true),
          text("slug", "Slug", row.slug, true),
          area("description", "Description", row.description, true),
          { name: "sortOrder", label: "Sort order", value: String(row.sortOrder), type: "number" },
        ],
      };
    }
    case "experiences": {
      const row = await getExperience(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: [
          choice(
            "categoryId",
            "Category",
            row.categoryId,
            await options(listExperienceCategoryOptions),
            true,
          ),
          text("name", "Name", row.name, true),
          text("slug", "Slug", row.slug, true),
          area("summary", "Summary", row.summary, true),
          area("description", "Description", row.description, true),
          area("seasonality", "Seasonality", row.seasonality ?? ""),
          text("seasonSourceNote", "Season source note", row.seasonSourceNote ?? ""),
          {
            name: "seasonReviewedAt",
            label: "Season reviewed at",
            value: dateValue(row.seasonReviewedAt),
            type: "datetime-local",
          },
          area("suitability", "Suitability", row.suitability ?? ""),
          text("durationGuidance", "Duration guidance", row.durationGuidance ?? ""),
          text("difficulty", "Difficulty", row.difficulty ?? ""),
          area("safetyNotes", "Safety notes", row.safetyNotes ?? ""),
          area("environmentalNotes", "Environmental notes", row.environmentalNotes ?? ""),
          text("seoTitle", "SEO title", row.seoTitle ?? ""),
          area("seoDescription", "SEO description", row.seoDescription ?? ""),
        ],
      };
    }
    case "offers": {
      const row = await getOffer(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: await offerEditorFields({
          resortId: row.resortId,
          roomTypeId: row.roomTypeId ?? "",
          title: row.title,
          slug: row.slug,
          summary: row.summary,
          currency: row.currency.trim(),
          fromPrice: decimalValue(row.fromPrice),
          occupancyBasisId: row.occupancyBasisId,
          mealPlanId: row.mealPlanId,
          transferIncluded: row.transferIncluded ? "true" : "false",
          validFrom: formatDateOnly(row.validFrom),
          validUntil: formatDateOnly(row.validUntil),
          stayFrom: row.stayFrom ? formatDateOnly(row.stayFrom) : "",
          stayUntil: row.stayUntil ? formatDateOnly(row.stayUntil) : "",
          minNights: row.minNights ? String(row.minNights) : "",
          terms: row.terms,
          inclusions: row.inclusions.map((item) => item.text).join("\n"),
          exclusions: row.exclusions.map((item) => item.text).join("\n"),
          seoTitle: row.seoTitle ?? "",
          seoDescription: row.seoDescription ?? "",
        }),
      };
    }
    default:
      return { fields: [] };
  }
}

async function blankCatalogFields(section: string): Promise<EditorField[]> {
  switch (section) {
    case "atolls":
      return [
        text("name", "Name", "", true),
        text("slug", "Slug", "", true),
        area("summary", "Summary", "", true),
        area("description", "Description", "", true),
        text("latitude", "Latitude"),
        text("longitude", "Longitude"),
        text("seoTitle", "SEO title"),
        area("seoDescription", "SEO description"),
      ];
    case "islands":
      return [
        choice("atollId", "Atoll", "", await options(listAtollOptions), true),
        choice(
          "islandType",
          "Island type",
          "RESORT",
          enumOptions(["RESORT", "LOCAL", "UNINHABITED"]),
          true,
        ),
        text("name", "Name", "", true),
        text("slug", "Slug", "", true),
        area("summary", "Summary", "", true),
        area("description", "Description", "", true),
        area("history", "History"),
        area("cultureNotes", "Culture notes"),
        area("etiquette", "Etiquette"),
        text("latitude", "Latitude"),
        text("longitude", "Longitude"),
        text("seoTitle", "SEO title"),
        area("seoDescription", "SEO description"),
      ];
    case "resorts":
      return [
        choice("islandId", "Island", "", await options(listIslandOptions), true),
        text("name", "Name", "", true),
        text("slug", "Slug", "", true),
        choice(
          "propertyType",
          "Property type",
          "RESORT",
          enumOptions(["RESORT", "GUESTHOUSE", "LIVEABOARD"]),
          true,
        ),
        area("summary", "Summary", "", true),
        area("description", "Description", "", true),
        area("editorialPositioning", "Editorial positioning"),
        choice(
          "priceBandId",
          "Price band",
          "",
          await options(listVocabulary.bind(null, "PRICE_BAND")),
        ),
        text("seoTitle", "SEO title"),
        area("seoDescription", "SEO description"),
        text("indicativeFromPrice", "Indicative price"),
        text("indicativeCurrency", "Currency"),
        text("priceBasis", "Price basis"),
        choice("priceIncludesTransfer", "Includes transfer", "", yesNo),
        choice("priceIncludesTax", "Includes tax", "", yesNo),
        text("priceSourceNote", "Price source note"),
        { name: "priceReviewedAt", label: "Price reviewed at", value: "", type: "datetime-local" },
        choice("hasHouseReef", "House reef", "", yesNo),
        area("reefSummary", "Reef summary"),
        area("diveCenterSummary", "Dive center summary"),
        text("reefSourceNote", "Reef source note"),
        { name: "reefReviewedAt", label: "Reef reviewed at", value: "", type: "datetime-local" },
        text("starCategory", "Star category"),
        text("starCategorySource", "Star category source"),
        area("checkInNotes", "Check-in notes"),
      ];
    case "rooms":
      return [
        choice("resortId", "Resort", "", await options(listResortOptions), true),
        choice(
          "categoryId",
          "Category",
          "",
          await options(listVocabulary.bind(null, "ROOM_CATEGORY")),
          true,
        ),
        text("name", "Name", "", true),
        text("slug", "Slug", "", true),
        area("description", "Description", "", true),
        { name: "maxAdults", label: "Maximum adults", value: "2", type: "number", required: true },
        { name: "maxChildren", label: "Maximum children", value: "0", type: "number" },
      ];
    case "dining":
      return [
        choice("resortId", "Resort", "", await options(listResortOptions), true),
        choice(
          "venueTypeId",
          "Venue type",
          "",
          await options(listVocabulary.bind(null, "VENUE_TYPE")),
          true,
        ),
        text("name", "Name", "", true),
        area("description", "Description", "", true),
        text("cuisine", "Cuisine"),
      ];
    case "transfers":
      return [
        choice("resortId", "Resort", "", await options(listResortOptions), true),
        choice(
          "transferTypeId",
          "Transfer type",
          "",
          await options(listVocabulary.bind(null, "TRANSFER_TYPE")),
          true,
        ),
        text("label", "Label", "", true),
        text("durationMinutes", "Duration minutes"),
        text("sourceNote", "Source note"),
        area("notes", "Notes"),
      ];
    case "amenities":
      return [
        text("code", "Code", "", true),
        text("name", "Name", "", true),
        text("category", "Category", "", true),
        area("description", "Description"),
      ];
    case "audiences":
      return [text("code", "Code", "", true), text("name", "Name", "", true)];
    case "experience-categories":
      return [
        text("name", "Name", "", true),
        text("slug", "Slug", "", true),
        area("description", "Description", "", true),
        { name: "sortOrder", label: "Sort order", value: "0", type: "number" },
      ];
    case "experiences":
      return [
        choice("categoryId", "Category", "", await options(listExperienceCategoryOptions), true),
        text("name", "Name", "", true),
        text("slug", "Slug", "", true),
        area("summary", "Summary", "", true),
        area("description", "Description", "", true),
        area("seasonality", "Seasonality"),
        text("seasonSourceNote", "Season source note"),
        {
          name: "seasonReviewedAt",
          label: "Season reviewed at",
          value: "",
          type: "datetime-local",
        },
        area("suitability", "Suitability"),
        text("durationGuidance", "Duration guidance"),
        text("difficulty", "Difficulty"),
        area("safetyNotes", "Safety notes"),
        area("environmentalNotes", "Environmental notes"),
        text("seoTitle", "SEO title"),
        area("seoDescription", "SEO description"),
      ];
    case "offers":
      return offerEditorFields();
    default:
      return [];
  }
}

async function resortFields(
  row: NonNullable<Awaited<ReturnType<typeof getResort>>>,
): Promise<EditorField[]> {
  return [
    choice("islandId", "Island", row.islandId, await options(listIslandOptions), true),
    text("name", "Name", row.name, true),
    text("slug", "Slug", row.slug, true),
    choice(
      "propertyType",
      "Property type",
      row.propertyType,
      enumOptions(["RESORT", "GUESTHOUSE", "LIVEABOARD"]),
      true,
    ),
    area("summary", "Summary", row.summary, true),
    area("description", "Description", row.description, true),
    area("editorialPositioning", "Editorial positioning", row.editorialPositioning ?? ""),
    choice(
      "priceBandId",
      "Price band",
      row.priceBandId ?? "",
      await options(listVocabulary.bind(null, "PRICE_BAND")),
    ),
    text("seoTitle", "SEO title", row.seoTitle ?? ""),
    area("seoDescription", "SEO description", row.seoDescription ?? ""),
    text("indicativeFromPrice", "Indicative price", decimalValue(row.indicativeFromPrice)),
    text("indicativeCurrency", "Currency", row.indicativeCurrency?.trim() ?? ""),
    text("priceBasis", "Price basis", row.priceBasis ?? ""),
    choice(
      "priceIncludesTransfer",
      "Includes transfer",
      flagValue(row.priceIncludesTransfer),
      yesNo,
    ),
    choice("priceIncludesTax", "Includes tax", flagValue(row.priceIncludesTax), yesNo),
    text("priceSourceNote", "Price source note", row.priceSourceNote ?? ""),
    {
      name: "priceReviewedAt",
      label: "Price reviewed at",
      value: dateValue(row.priceReviewedAt),
      type: "datetime-local",
    },
    choice("hasHouseReef", "House reef", flagValue(row.hasHouseReef), yesNo),
    area("reefSummary", "Reef summary", row.reefSummary ?? ""),
    area("diveCenterSummary", "Dive center summary", row.diveCenterSummary ?? ""),
    text("reefSourceNote", "Reef source note", row.reefSourceNote ?? ""),
    {
      name: "reefReviewedAt",
      label: "Reef reviewed at",
      value: dateValue(row.reefReviewedAt),
      type: "datetime-local",
    },
    text("starCategory", "Star category", row.starCategory ? String(row.starCategory) : ""),
    text("starCategorySource", "Star category source", row.starCategorySource ?? ""),
    area("checkInNotes", "Check-in notes", row.checkInNotes ?? ""),
    choice(
      "amenityId",
      "Add amenity",
      "",
      await options(async () =>
        (await listAmenities()).map((item) => ({ id: item.id, name: item.name })),
      ),
    ),
    choice(
      "audienceTagId",
      "Add audience",
      "",
      await options(async () =>
        (await listAudiences()).map((item) => ({ id: item.id, name: item.name })),
      ),
    ),
  ];
}

export async function contentFields(
  section: string,
  id: string,
): Promise<{ fields: EditorField[]; status?: PublishStatus }> {
  if (id === "new") return { fields: await blankContentFields(section) };
  switch (section) {
    case "categories": {
      const row = await getContentCategory(id);
      if (!row) return { fields: [] };
      return {
        fields: [
          text("name", "Name", row.name, true),
          text("slug", "Slug", row.slug, true),
          area("description", "Description", row.description, true),
          choice(
            "parentId",
            "Parent",
            row.parentId ?? "",
            await options(async () =>
              (await listContentCategories()).map((item) => ({ id: item.id, name: item.name })),
            ),
          ),
          { name: "sortOrder", label: "Sort order", value: String(row.sortOrder), type: "number" },
        ],
      };
    }
    case "tags": {
      const row = await getTag(id);
      if (!row) return { fields: [] };
      return {
        fields: [text("name", "Name", row.name, true), text("slug", "Slug", row.slug, true)],
      };
    }
    case "authors": {
      const row = await getExpert(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: [
          text("name", "Name", row.name, true),
          text("slug", "Slug", row.slug, true),
          text("title", "Title", row.title, true),
          area("bio", "Bio", row.bio, true),
        ],
      };
    }
    case "articles": {
      const row = await getArticle(id);
      if (!row) return { fields: [] };
      const body = row.bodyPlain;
      return {
        status: row.status,
        fields: [
          text("title", "Title", row.title, true),
          text("slug", "Slug", row.slug, true),
          area("excerpt", "Excerpt", row.excerpt, true),
          area("bodyText", "Body", body, true),
          choice(
            "categoryId",
            "Category",
            row.categoryId,
            await options(async () =>
              (await listContentCategories()).map((item) => ({ id: item.id, name: item.name })),
            ),
            true,
          ),
          choice(
            "authorId",
            "Author",
            row.authorId,
            await options(async () =>
              (await listExperts()).map((item) => ({ id: item.id, name: item.name })),
            ),
            true,
          ),
          choice(
            "reviewerId",
            "Reviewer",
            row.reviewerId ?? "",
            await options(async () =>
              (await listExperts()).map((item) => ({ id: item.id, name: item.name })),
            ),
          ),
          {
            name: "reviewedAt",
            label: "Reviewed at",
            value: dateValue(row.reviewedAt),
            type: "datetime-local",
          },
          text("seoTitle", "SEO title", row.seoTitle ?? ""),
          area("seoDescription", "SEO description", row.seoDescription ?? ""),
          text("locale", "Locale", row.locale, true),
        ],
      };
    }
    case "faqs": {
      const row = await getFaq(id);
      if (!row) return { fields: [] };
      return {
        status: row.status,
        fields: [
          choice(
            "ownerType",
            "Owner type",
            row.ownerType,
            enumOptions(["GLOBAL", "RESORT", "ISLAND", "ATOLL", "EXPERIENCE", "ARTICLE"]),
            true,
          ),
          text("ownerId", "Owner id", row.ownerId ?? ""),
          text("question", "Question", row.question, true),
          area("answer", "Answer", row.answer, true),
          { name: "sortOrder", label: "Sort order", value: String(row.sortOrder), type: "number" },
        ],
      };
    }
    case "collections": {
      const row = await getCollection(id);
      if (!row) return { fields: [] };
      const body =
        row.body &&
        typeof row.body === "object" &&
        "text" in row.body &&
        typeof row.body.text === "string"
          ? row.body.text
          : "";
      return {
        status: row.status,
        fields: [
          text("title", "Title", row.title, true),
          text("slug", "Slug", row.slug, true),
          area("summary", "Summary", row.summary, true),
          area("bodyText", "Body", body),
          text("seoTitle", "SEO title", row.seoTitle ?? ""),
          area("seoDescription", "SEO description", row.seoDescription ?? ""),
        ],
      };
    }
    case "homepage": {
      const row = await getHomepageModule(id);
      if (!row) return { fields: [] };
      const textValue =
        row.config &&
        typeof row.config === "object" &&
        "text" in row.config &&
        typeof row.config.text === "string"
          ? row.config.text
          : "";
      return {
        status: row.status,
        fields: [
          choice(
            "moduleType",
            "Module type",
            row.moduleType,
            enumOptions([
              "HERO",
              "FEATURED_RESORTS",
              "FEATURED_OFFERS",
              "FEATURED_EXPERIENCES",
              "FEATURED_GUIDES",
              "DESTINATION_EXPLAINER",
              "TRUST",
              "TESTIMONIALS",
              "NEWSLETTER",
              "RECENTLY_VIEWED",
            ]),
            true,
          ),
          text("title", "Title", row.title ?? ""),
          area("text", "Text", textValue),
          { name: "sortOrder", label: "Sort order", value: String(row.sortOrder), type: "number" },
        ],
      };
    }
    case "blocks": {
      const row = await getBlock(id);
      if (!row) return { fields: [] };
      const body =
        row.body &&
        typeof row.body === "object" &&
        "text" in row.body &&
        typeof row.body.text === "string"
          ? row.body.text
          : "";
      return {
        status: row.status,
        fields: [
          text("code", "Code", row.code, true),
          choice(
            "blockType",
            "Block type",
            row.blockType,
            enumOptions([
              "RICH_TEXT",
              "CALLOUT",
              "FAQ_LIST",
              "CTA",
              "RELATED_ENTITIES",
              "IMAGE_BAND",
            ]),
            true,
          ),
          area("bodyText", "Body", body, true),
        ],
      };
    }
    default:
      return { fields: [] };
  }
}

async function blankContentFields(section: string): Promise<EditorField[]> {
  switch (section) {
    case "categories":
      return [
        text("name", "Name", "", true),
        text("slug", "Slug", "", true),
        area("description", "Description", "", true),
        choice(
          "parentId",
          "Parent",
          "",
          await options(async () =>
            (await listContentCategories()).map((item) => ({ id: item.id, name: item.name })),
          ),
        ),
        { name: "sortOrder", label: "Sort order", value: "0", type: "number" },
      ];
    case "tags":
      return [text("name", "Name", "", true), text("slug", "Slug", "", true)];
    case "authors":
      return [
        text("name", "Name", "", true),
        text("slug", "Slug", "", true),
        text("title", "Title", "", true),
        area("bio", "Bio", "", true),
      ];
    case "articles":
      return [
        text("title", "Title", "", true),
        text("slug", "Slug", "", true),
        area("excerpt", "Excerpt", "", true),
        area("bodyText", "Body", "", true),
        choice(
          "categoryId",
          "Category",
          "",
          await options(async () =>
            (await listContentCategories()).map((item) => ({ id: item.id, name: item.name })),
          ),
          true,
        ),
        choice(
          "authorId",
          "Author",
          "",
          await options(async () =>
            (await listExperts()).map((item) => ({ id: item.id, name: item.name })),
          ),
          true,
        ),
        choice(
          "reviewerId",
          "Reviewer",
          "",
          await options(async () =>
            (await listExperts()).map((item) => ({ id: item.id, name: item.name })),
          ),
        ),
        { name: "reviewedAt", label: "Reviewed at", value: "", type: "datetime-local" },
        text("seoTitle", "SEO title"),
        area("seoDescription", "SEO description"),
        text("locale", "Locale", "en", true),
      ];
    case "faqs":
      return [
        choice(
          "ownerType",
          "Owner type",
          "GLOBAL",
          enumOptions(["GLOBAL", "RESORT", "ISLAND", "ATOLL", "EXPERIENCE", "ARTICLE"]),
          true,
        ),
        text("ownerId", "Owner id"),
        text("question", "Question", "", true),
        area("answer", "Answer", "", true),
        { name: "sortOrder", label: "Sort order", value: "0", type: "number" },
      ];
    case "collections":
      return [
        text("title", "Title", "", true),
        text("slug", "Slug", "", true),
        area("summary", "Summary", "", true),
        area("bodyText", "Body"),
        text("seoTitle", "SEO title"),
        area("seoDescription", "SEO description"),
      ];
    case "homepage":
      return [
        choice(
          "moduleType",
          "Module type",
          "HERO",
          enumOptions([
            "HERO",
            "FEATURED_RESORTS",
            "FEATURED_OFFERS",
            "FEATURED_EXPERIENCES",
            "FEATURED_GUIDES",
            "DESTINATION_EXPLAINER",
            "TRUST",
            "TESTIMONIALS",
            "NEWSLETTER",
            "RECENTLY_VIEWED",
          ]),
          true,
        ),
        text("title", "Title"),
        area("text", "Text"),
        { name: "sortOrder", label: "Sort order", value: "0", type: "number" },
      ];
    case "blocks":
      return [
        text("code", "Code", "", true),
        choice(
          "blockType",
          "Block type",
          "RICH_TEXT",
          enumOptions([
            "RICH_TEXT",
            "CALLOUT",
            "FAQ_LIST",
            "CTA",
            "RELATED_ENTITIES",
            "IMAGE_BAND",
          ]),
          true,
        ),
        area("bodyText", "Body", "", true),
      ];
    default:
      return [];
  }
}

export async function mediaFields(
  id: string,
): Promise<{ fields: EditorField[]; status?: PublishStatus }> {
  const row = await getMedia(id);
  if (!row) return { fields: [] };
  return {
    status: row.status,
    fields: [
      area("altText", "Alt text", row.altText ?? ""),
      area("caption", "Caption", row.caption ?? ""),
      text("attribution", "Attribution", row.attribution ?? ""),
      choice(
        "ownerType",
        "Link owner type",
        "",
        enumOptions([
          "RESORT",
          "ROOM_TYPE",
          "DINING_VENUE",
          "ISLAND",
          "ATOLL",
          "EXPERIENCE",
          "ARTICLE",
          "COLLECTION",
        ]),
      ),
      text("ownerId", "Owner id"),
      choice("role", "Role", "", enumOptions(["HERO", "GALLERY", "OG", "PORTRAIT", "ATTACHMENT"])),
    ],
  };
}

export async function allowedStatuses(
  userId: string,
  status: PublishStatus,
  domain: "catalog" | "content" | "media",
): Promise<PublishStatus[]> {
  const permissions = await permissionsForUser(userId);
  return nextPublishStatuses(status).filter((next) => canTransitionWith(permissions, next, domain));
}

const yesNo = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function flagValue(value: boolean | null): string {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

function enumOptions(values: string[]): Array<{ value: string; label: string }> {
  return values.map((value) => ({ value, label: value }));
}

async function offerEditorFields(values?: {
  resortId: string;
  roomTypeId: string;
  title: string;
  slug: string;
  summary: string;
  currency: string;
  fromPrice: string;
  occupancyBasisId: string;
  mealPlanId: string;
  transferIncluded: string;
  validFrom: string;
  validUntil: string;
  stayFrom: string;
  stayUntil: string;
  minNights: string;
  terms: string;
  inclusions: string;
  exclusions: string;
  seoTitle: string;
  seoDescription: string;
}): Promise<EditorField[]> {
  const rooms = (await listRooms()).map((room) => ({
    value: room.id,
    label: `${room.name} · ${room.resort.name}`,
  }));
  return [
    choice("resortId", "Resort", values?.resortId ?? "", await options(listResortOptions), true),
    choice("roomTypeId", "Room", values?.roomTypeId ?? "", rooms),
    text("title", "Title", values?.title ?? "", true),
    text("slug", "Slug", values?.slug ?? "", true),
    area("summary", "Summary", values?.summary ?? "", true),
    text("currency", "Currency", values?.currency ?? "", true),
    text("fromPrice", "Staff price", values?.fromPrice ?? "", true),
    choice(
      "occupancyBasisId",
      "Occupancy basis",
      values?.occupancyBasisId ?? "",
      await options(listVocabulary.bind(null, "OCCUPANCY_BASIS")),
      true,
    ),
    choice(
      "mealPlanId",
      "Meal plan",
      values?.mealPlanId ?? "",
      await options(listVocabulary.bind(null, "MEAL_PLAN")),
      true,
    ),
    choice("transferIncluded", "Transfer included", values?.transferIncluded ?? "", yesNo, true),
    text("validFrom", "Valid from", values?.validFrom ?? "", true),
    text("validUntil", "Valid until", values?.validUntil ?? "", true),
    text("stayFrom", "Stay from", values?.stayFrom ?? ""),
    text("stayUntil", "Stay until", values?.stayUntil ?? ""),
    text("minNights", "Minimum nights", values?.minNights ?? ""),
    area("terms", "Terms", values?.terms ?? "", true),
    area("inclusions", "Inclusions", values?.inclusions ?? ""),
    area("exclusions", "Exclusions", values?.exclusions ?? ""),
    text("seoTitle", "SEO title", values?.seoTitle ?? ""),
    area("seoDescription", "SEO description", values?.seoDescription ?? ""),
  ];
}

async function options(
  load: () => Promise<Array<{ id: string; name?: string; label?: string }>>,
): Promise<Array<{ value: string; label: string }>> {
  const rows = await load();
  return rows.map((row) => ({ value: row.id, label: row.name ?? row.label ?? row.id }));
}

export const catalogSectionTitles: Record<string, string> = {
  atolls: "Atolls",
  islands: "Islands",
  resorts: "Resorts",
  rooms: "Room types",
  dining: "Dining venues",
  transfers: "Transfers",
  amenities: "Amenities",
  audiences: "Audience tags",
  "experience-categories": "Experience categories",
  experiences: "Experiences",
  offers: "Offers",
};

export const catalogSectionSingular: Record<string, string> = {
  atolls: "atoll",
  islands: "island",
  resorts: "resort",
  rooms: "room type",
  dining: "dining venue",
  transfers: "transfer",
  amenities: "amenity",
  audiences: "audience tag",
  "experience-categories": "experience category",
  experiences: "experience",
  offers: "offer",
};

export const contentSectionTitles: Record<string, string> = {
  categories: "Content categories",
  tags: "Tags",
  authors: "Author profiles",
  articles: "Articles",
  faqs: "FAQs",
  collections: "Collections",
  homepage: "Homepage modules",
  blocks: "Reusable blocks",
};

export const contentSectionSingular: Record<string, string> = {
  categories: "content category",
  tags: "tag",
  authors: "author profile",
  articles: "article",
  faqs: "FAQ",
  collections: "collection",
  homepage: "homepage module",
  blocks: "reusable block",
};

export function knownCatalogSection(section: string): boolean {
  return section in catalogSectionTitles;
}

export function knownContentSection(section: string): boolean {
  return section in contentSectionTitles;
}
