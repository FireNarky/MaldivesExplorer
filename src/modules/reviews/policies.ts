export function canModerateReview(permissions: readonly string[]): boolean {
  return permissions.includes("review.moderate") || permissions.includes("review.publish");
}

export function canPublishReview(permissions: readonly string[]): boolean {
  return permissions.includes("review.publish");
}
