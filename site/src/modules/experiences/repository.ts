import { db } from "@/lib/db";

export function listExperienceCategories() {
  return db.experienceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, status: true },
  });
}

export function getExperienceCategory(id: string) {
  return db.experienceCategory.findUnique({ where: { id } });
}

export function listExperiences() {
  return db.experience.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      category: { select: { name: true } },
    },
  });
}

export function getExperience(id: string) {
  return db.experience.findUnique({ where: { id } });
}

export function listExperienceCategoryOptions() {
  return db.experienceCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
