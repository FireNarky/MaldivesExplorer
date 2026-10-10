import { PrismaClient, VocabularySet, type EmailClassification, type Prisma } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  permissionCodes,
  permissionsForRole,
  roleCodes,
  type RoleCode,
} from "../src/lib/auth/permissions";

const db = new PrismaClient();

function titleFromCode(code: string): string {
  return code
    .toLowerCase()
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const vocabulary: Record<VocabularySet, readonly string[]> = {
  MEAL_PLAN: ["ROOM_ONLY", "BED_BREAKFAST", "HALF_BOARD", "FULL_BOARD", "ALL_INCLUSIVE"],
  TRANSFER_TYPE: ["SPEEDBOAT", "SEAPLANE", "DOMESTIC_FLIGHT", "COMBINED"],
  OCCUPANCY_BASIS: ["DOUBLE", "SINGLE", "FAMILY"],
  PRICE_BAND: ["BUDGET", "MID", "PREMIUM", "LUXURY"],
  TRIP_TYPE: ["HONEYMOON", "FAMILY", "LUXURY", "ADVENTURE", "DIVING", "OTHER"],
  LOSS_REASON: ["PRICE", "DATES", "CHOSE_OTHER", "NO_RESPONSE", "DUPLICATE", "NOT_A_FIT", "OTHER"],
  CLOSURE_REASON: ["COMPLETED", "DUPLICATE", "SPAM", "WITHDRAWN", "OTHER"],
  ROOM_CATEGORY: ["BEACH_VILLA", "WATER_VILLA", "SUITE", "ROOM", "OTHER"],
  VENUE_TYPE: ["RESTAURANT", "BAR", "CAFE", "IN_VILLA"],
};

const settings: Record<string, unknown> = {
  "comparison.maxItems": 3,
  "quote.approval.discountPercent": 10,
  "quote.approval.grandTotalUsd": 25000,
  "sla.firstResponseMinutes": 120,
  "planner.draftTtlDays": 30,
  "wishlist.maxAnonymous": 50,
  "export.maxRows": 5000,
  "public.pageSize": 24,
  "admin.pageSize": 50,
  requireSeparationOfDuties: true,
  roundRobinAssignment: false,
  displayCurrency: "USD",
  businessTimezone: "Indian/Maldives",
  "childAge.min": 2,
  "childAge.max": 11,
  "infantAge.max": 1,
  "notice.version": "2026-10-10",
};

const transactionalTemplates = [
  "enquiry.received",
  "enquiry.assigned",
  "quote.sent",
  "quote.accepted.internal",
  "auth.magic-link",
  "auth.reset-password",
  "newsletter.confirm",
];

async function seedRoles(): Promise<void> {
  for (const code of permissionCodes) {
    await db.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
  }
  for (const code of roleCodes) {
    await db.role.upsert({
      where: { code },
      update: {},
      create: { code, name: titleFromCode(code), description: code },
    });
  }
  for (const roleCode of roleCodes) {
    const role = await db.role.findUniqueOrThrow({ where: { code: roleCode } });
    for (const permissionCode of permissionsForRole(roleCode as RoleCode)) {
      const permission = await db.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

async function seedReferenceData(): Promise<void> {
  const vocabularyEntries = Object.entries(vocabulary) as [VocabularySet, readonly string[]][];
  for (const [set, codes] of vocabularyEntries) {
    for (const [index, code] of codes.entries()) {
      await db.vocabularyItem.upsert({
        where: { set_code: { set, code } },
        update: {},
        create: { set, code, label: titleFromCode(code), sortOrder: index },
      });
    }
  }
  for (const code of ["family", "adults-only", "honeymoon", "diving", "luxury", "budget"]) {
    await db.audienceTag.upsert({
      where: { code },
      update: {},
      create: { code, name: titleFromCode(code) },
    });
  }
  const categories = [
    "whale-sharks",
    "manta-rays",
    "scuba-diving",
    "snorkeling",
    "cruises",
    "fishing",
    "spa",
    "water-sports",
    "sandbanks",
  ];
  for (const [index, slug] of categories.entries()) {
    await db.experienceCategory.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: titleFromCode(slug),
        description: "Taxonomy entry.",
        sortOrder: index,
        status: "PUBLISHED",
      },
    });
  }
  const existingSla = await db.slaPolicy.findFirst({
    where: { name: "Default Maldives business hours" },
  });
  if (!existingSla) {
    await db.slaPolicy.create({
      data: {
        name: "Default Maldives business hours",
        firstResponseMinutes: 120,
        active: true,
        businessHours: {
          timezone: "Indian/Maldives",
          days: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"],
          start: "09:00",
          end: "17:00",
        },
      },
    });
  }
  for (const [key, value] of Object.entries(settings)) {
    await db.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as Prisma.InputJsonValue },
    });
  }
  const retiresOn = new Date();
  retiresOn.setUTCFullYear(retiresOn.getUTCFullYear() + 1);
  for (const key of [
    "mapView",
    "tour360Viewer",
    "roundRobinAssignment",
    "newsletterDoubleOptIn",
    "experiments",
  ]) {
    await db.featureFlag.upsert({
      where: { key },
      update: {},
      create: { key, enabled: false, owner: "platform", description: key, retiresOn },
    });
  }
  const templates: Array<{ code: string; classification: EmailClassification }> = [
    ...transactionalTemplates.map((code) => ({ code, classification: "TRANSACTIONAL" as const })),
    { code: "newsletter.welcome", classification: "MARKETING" as const },
  ];
  for (const template of templates) {
    await db.emailTemplate.upsert({
      where: { code_locale_version: { code: template.code, locale: "en", version: 1 } },
      update: {},
      create: {
        code: template.code,
        locale: "en",
        classification: template.classification,
        subject: "",
        body: "",
        status: "DRAFT",
      },
    });
  }
}

async function seedAdministrator(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrator", passwordHash, status: "ACTIVE" },
  });
  const role = await db.role.findUniqueOrThrow({ where: { code: "ADMINISTRATOR" } });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
}

async function main(): Promise<void> {
  await seedRoles();
  await seedReferenceData();
  await seedAdministrator();
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    await db.$disconnect();
    process.exit(1);
  });
