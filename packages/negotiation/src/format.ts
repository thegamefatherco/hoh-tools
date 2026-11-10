const LETTERS = "ABCDEFGHIJ";
const NEARLY_ONE = 0.9995;
const TINY = 0.0005;
const ONE_DECIMAL_BELOW = 0.1;
const PERCENT = 100;
const LOCALE = "en-US";

/** Letter of a pool item by position: 0 -> "A". */
export const letterOf = (item: number): string => LETTERS[item] ?? "?";

/**
 * "0%" for exactly 0, "<0.1%" for very small values, one decimal below 10%, whole
 * numbers otherwise.
 */
export const formatPercent = (value: number): string => {
  if (value === 0) {
    return "0%";
  }
  if (value >= NEARLY_ONE) {
    return "100%";
  }
  if (value < TINY) {
    return "<0.1%";
  }
  return `${(value * PERCENT).toFixed(value < ONE_DECIMAL_BELOW ? 1 : 0)}%`;
};

/** Number with thousands separators. */
export const formatCount = (value: number): string =>
  value.toLocaleString(LOCALE);

export const formatFactor = (factor: number): string => `×${factor}`;

/** "2+1+1+1" -> "2 of one item, rest different"; "1+1+1" -> "all different". */
export const describePattern = (pattern: string): string => {
  const parts = pattern.split("+").map(Number);
  const repeats = parts.filter((part) => part > 1);
  if (repeats.length === 0) {
    return "all different";
  }
  const repeated = repeats.map((part) => `${part} of one item`).join(", ");
  return repeats.length < parts.length
    ? `${repeated}, rest different`
    : repeated;
};
