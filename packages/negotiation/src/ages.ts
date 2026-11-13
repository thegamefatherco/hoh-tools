/** The 14 ages in game order. An age index is a position in this list. */
export const AGE_IDS = [
  "StoneAge",
  "BronzeAge",
  "MinoanEra",
  "ClassicGreece",
  "EarlyRome",
  "RomanEmpire",
  "ByzantineEra",
  "AgeOfTheFranks",
  "FeudalAge",
  "IberianEra",
  "KingdomOfSicily",
  "HighMiddleAges",
  "EarlyGothicEra",
  "LateGothicEra",
] as const;

export const AGE_LABELS = [
  "Stone Age",
  "Bronze Age",
  "Minoan Era",
  "Classic Greece",
  "Early Rome",
  "Roman Empire",
  "Byzantine Era",
  "Age of the Franks",
  "Feudal Age",
  "Iberian Era",
  "Kingdom of Sicily",
  "High Middle Ages",
  "Early Gothic Era",
  "Late Gothic Era",
] as const;

export const AGE_COUNT = AGE_IDS.length;

/** Part of a namespaced id after the last dot: "age.StoneAge" -> "StoneAge". */
export const shortId = (id: string): string =>
  id.slice(id.lastIndexOf(".") + 1);

export const ageIndexOf = (id: string): number => {
  const ids: readonly string[] = AGE_IDS;
  return ids.indexOf(shortId(id));
};
