import openingsJson from "./generated/openings.json" with { type: "json" };

/**
 * Value of one first move, described by its repeat pattern (an integer partition
 * of the slot count, e.g. "2+1+1+1").
 */
export interface OpeningRow {
  /** Chance to clear with 2 turns and best play afterwards. */
  p2: number;
  /** Chance to clear with 3 turns and best play afterwards. */
  p3: number;
  pat: string;
}

/** table[slots][items] = every pattern for that game size. */
export type OpeningTable = Record<string, Record<string, OpeningRow[]>>;

export interface OpeningChoice {
  /** Every pattern with its clear chance for the turns available, best first. */
  alternatives: { p: number; pat: string }[];
  best: OpeningRow;
  /** Clear chance of the best pattern. */
  chance: number;
}

const THREE_TURNS = 3;
const TWO_TURNS = 2;

/** Opening table precomputed by `scripts/precompute-openings.ts`. */
export const OPENINGS: OpeningTable = openingsJson;

/**
 * Best opening for a game size. With 3 or more turns patterns are ranked by `p3`
 * then `p2`; with 2 turns by `p2` then `p3`. Ties keep table order.
 */
export const pickOpening = (
  table: OpeningTable | undefined,
  k: number,
  n: number,
  turnsLeft: number
): OpeningChoice | null => {
  const rows = table?.[String(k)]?.[String(n)];
  if (rows === undefined || rows.length === 0) {
    return null;
  }
  const hasThreeTurns = turnsLeft >= THREE_TURNS;
  const primary = (row: OpeningRow): number =>
    hasThreeTurns ? row.p3 : row.p2;
  const secondary = (row: OpeningRow): number =>
    hasThreeTurns ? row.p2 : row.p3;
  const sorted = rows.toSorted(
    (left, right) =>
      primary(right) - primary(left) || secondary(right) - secondary(left)
  );
  const [best] = sorted;
  return {
    alternatives: sorted.map((row) => ({ p: primary(row), pat: row.pat })),
    best,
    chance: primary(best),
  };
};

/**
 * Chance to clear a negotiation with best play, or null when the game size is not
 * in the table.
 */
export const clearChance = (
  k: number,
  n: number,
  turns: number,
  table: OpeningTable = OPENINGS
): number | null => {
  if (turns < TWO_TURNS) {
    return turns === 1 ? n ** -k : 0;
  }
  return pickOpening(table, k, n, turns)?.chance ?? null;
};
