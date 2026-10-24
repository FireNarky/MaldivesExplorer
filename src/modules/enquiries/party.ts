/**
 * `Enquiry.adultCount` is a required column (it has a CHECK of at least 1 and drives traveler
 * rows), so enquiries that do not collect a party size, such as /contact, store a placeholder of
 * one adult. The submitted snapshot records whether the customer actually supplied the party, so
 * staff and customer views never present the placeholder as customer-confirmed.
 */

export const PARTY_NOT_SUPPLIED_LABEL = "Not supplied by customer (system placeholder: 1 adult)";

export function partySupplied(snapshot: unknown): boolean {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return true;
  const party = (snapshot as Record<string, unknown>).party;
  if (!party || typeof party !== "object" || Array.isArray(party)) return true;
  return (party as Record<string, unknown>).supplied !== false;
}
