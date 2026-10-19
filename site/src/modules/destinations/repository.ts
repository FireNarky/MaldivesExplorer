import type { PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";

export function listAtolls() {
  return db.atoll.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true },
  });
}

export function getAtoll(id: string) {
  return db.atoll.findUnique({ where: { id } });
}

export function listIslands() {
  return db.island.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true, atoll: { select: { name: true } } },
  });
}

export function getIsland(id: string) {
  return db.island.findUnique({ where: { id } });
}

export function listAtollOptions() {
  return db.atoll.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export type DatedRecord = {
  id: string;
  status: PublishStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  unpublishedAt: Date | null;
  archivedAt: Date | null;
  createdById: string | null;
};
