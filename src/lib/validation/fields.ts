export function describedBy(ids: Array<string | undefined>): string | undefined {
  const present = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  return present.length > 0 ? present.join(" ") : undefined;
}
