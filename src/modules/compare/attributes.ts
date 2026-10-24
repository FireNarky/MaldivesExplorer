export const unknownValue = "Unknown";

export type ResortFacts = {
  islandName: string | null;
  atollName: string | null;
  transfers: Array<{ typeLabel: string; minutes: number | null }>;
  priceBand: string | null;
  mealPlans: string[];
  villaTypes: string[];
  audiences: string[];
  houseReef: boolean | null;
  positioning: string | null;
};

export type CompareColumn = {
  id: string;
  name: string;
  href: string | null;
  available: boolean;
  facts: ResortFacts | null;
};

export const compareAttributes = [
  "Island",
  "Atoll",
  "Transfer",
  "Price band",
  "Indicative price",
  "Meal plans",
  "Villa types",
  "Audiences",
  "House reef",
  "Editorial positioning",
] as const;

export type CompareAttribute = (typeof compareAttributes)[number];

/** De-duplicated, trimmed labels. Shared by `/compare` and the resort detail page. */
export function uniqueLabels(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function list(values: string[]): string {
  const unique = uniqueLabels(values);
  return unique.length > 0 ? unique.join("; ") : unknownValue;
}

export function attributeValue(attribute: CompareAttribute, column: CompareColumn): string {
  if (!column.available || !column.facts) return unknownValue;
  const facts = column.facts;
  if (attribute === "Island") return facts.islandName ?? unknownValue;
  if (attribute === "Atoll") return facts.atollName ?? unknownValue;
  if (attribute === "Transfer") {
    if (facts.transfers.length === 0) return unknownValue;
    return facts.transfers
      .map((transfer) =>
        transfer.minutes === null
          ? `${transfer.typeLabel}, ${unknownValue}`
          : `${transfer.typeLabel}, ${transfer.minutes} minutes`,
      )
      .join("; ");
  }
  if (attribute === "Price band") return facts.priceBand ?? unknownValue;
  if (attribute === "Indicative price") return "An indicative price is not published.";
  if (attribute === "Meal plans") return list(facts.mealPlans);
  if (attribute === "Villa types") return list(facts.villaTypes);
  if (attribute === "Audiences") return list(facts.audiences);
  if (attribute === "House reef") {
    if (facts.houseReef === null) return unknownValue;
    return facts.houseReef ? "Yes" : "No";
  }
  return facts.positioning?.trim() || unknownValue;
}
