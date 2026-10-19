import type { PublishStatus } from "@prisma/client";

export type PublicationDates = {
  status: PublishStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  unpublishedAt: Date | null;
  archivedAt: Date | null;
};

const nextStatus: Record<PublishStatus, readonly PublishStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "APPROVED"],
  APPROVED: ["DRAFT", "SCHEDULED", "PUBLISHED"],
  SCHEDULED: ["DRAFT", "PUBLISHED"],
  PUBLISHED: ["UNPUBLISHED"],
  UNPUBLISHED: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  ARCHIVED: [],
};

const publishPermissionStatuses = new Set<PublishStatus>([
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "UNPUBLISHED",
  "ARCHIVED",
]);

export function nextPublishStatuses(status: PublishStatus): readonly PublishStatus[] {
  return nextStatus[status];
}

export function canTransition(from: PublishStatus, to: PublishStatus): boolean {
  return nextStatus[from].includes(to);
}

export function transitionNeedsPublishPermission(status: PublishStatus): boolean {
  return publishPermissionStatuses.has(status);
}

export function publicationStamp(
  current: PublicationDates,
  next: PublishStatus,
  extras?: { scheduledAt?: Date | null },
  now = new Date(),
): PublicationDates {
  if (!canTransition(current.status, next)) {
    throw new Error(`Cannot move from ${current.status} to ${next}.`);
  }
  const scheduledAt = extras?.scheduledAt ?? current.scheduledAt;
  if (next === "SCHEDULED" && !scheduledAt) {
    throw new Error("Choose a schedule time.");
  }
  return {
    status: next,
    publishedAt: next === "PUBLISHED" && !current.publishedAt ? now : current.publishedAt,
    scheduledAt: next === "SCHEDULED" ? scheduledAt : current.scheduledAt,
    unpublishedAt: next === "UNPUBLISHED" ? now : current.unpublishedAt,
    archivedAt: next === "ARCHIVED" ? now : current.archivedAt,
  };
}

export type StatusWrite = {
  status: PublishStatus;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  unpublishedAt?: Date | null;
  archivedAt?: Date | null;
  updatedById: string;
};

export function editableStatus(status: PublishStatus): boolean {
  return (
    status === "DRAFT" ||
    status === "IN_REVIEW" ||
    status === "APPROVED" ||
    status === "UNPUBLISHED"
  );
}
