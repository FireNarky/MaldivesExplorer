export { moduleStatus, searchPublished, suggestPublished, writeSearchEvent } from "./service";
export {
  consentFromCookie,
  normalizeSearchQuery,
  parseSearchKind,
  readRecentSearches,
  searchKinds,
  shouldRecordSearch,
  writeRecentSearches,
} from "./query";
export type { SearchConsent, SearchHit, SearchKind, SearchSuggestion } from "./query";
