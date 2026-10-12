import type { SearchConsent } from "@/modules/search/query";
import { shouldRecordSearch } from "@/modules/search/query";
import { searchPublishedRecords, suggestPublishedRecords } from "@/modules/search/repository";
import type { SearchHit, SearchKind, SearchSuggestion } from "@/modules/search/query";
import { db } from "@/lib/db";

export const moduleStatus = "implemented" as const;

export async function searchPublished(
  query: string,
  kind: SearchKind | "all",
): Promise<SearchHit[]> {
  if (query.length === 0) return [];
  return searchPublishedRecords(query, kind);
}

export async function suggestPublished(query: string): Promise<SearchSuggestion[]> {
  if (query.trim().length < 2) return [];
  return suggestPublishedRecords(query.trim());
}

export async function writeSearchEvent(input: {
  query: string;
  resultCount: number;
  consent: SearchConsent;
  anonymousKey?: string;
  userId?: string;
}): Promise<boolean> {
  if (!shouldRecordSearch(input.consent) || input.query.length === 0) return false;
  await db.analyticsEvent.create({
    data: {
      eventName: "search_submitted",
      anonymousKey: input.anonymousKey,
      userId: input.userId,
      properties: { query: input.query, resultCount: input.resultCount },
      consentState: "GRANTED",
    },
  });
  return true;
}
