/* oxlint-disable no-bitwise -- reqMask is a bitmask of items */
import { OPEN_SLOT } from "./engine.ts";

/** One line of the deductions list, as data so any UI can word and render it. */
export type Deduction =
  | { count: number; kind: "count" }
  | { items: number; kind: "nothing-known" }
  | { item: number; kind: "slot-solved"; slot: number }
  | { item: number; kind: "slot-forced"; slot: number }
  | {
      kind: "slot-options";
      /** Possible items with their probability, highest first. */
      options: { item: number; probability: number }[];
      ruledOut: number[];
      slot: number;
    }
  | { items: number[]; kind: "eliminated" }
  | { item: number; kind: "wanted"; slots: number[] }
  | { items: number[]; kind: "untested" };

export interface DeductionInput {
  count: number;
  locked: readonly number[];
  marg: readonly (readonly number[])[];
  reqMask: number;
  untested: readonly number[];
}

export interface Deductions {
  /** Items with zero probability in every open slot. Empty before the first turn. */
  eliminated: number[];
  lines: Deduction[];
}

const slotLine = (input: DeductionInput, slot: number): Deduction => {
  const lockedItem = input.locked[slot];
  if (lockedItem !== OPEN_SLOT) {
    return { item: lockedItem, kind: "slot-solved", slot };
  }
  const counts = input.marg[slot];
  const possible: number[] = [];
  const ruledOut: number[] = [];
  for (const [item, count] of counts.entries()) {
    (count > 0 ? possible : ruledOut).push(item);
  }
  if (possible.length === 1) {
    return { item: possible[0], kind: "slot-forced", slot };
  }
  return {
    kind: "slot-options",
    options: possible
      .toSorted((left, right) => counts[right] - counts[left])
      .map((item) => ({ item, probability: counts[item] / input.count })),
    ruledOut,
    slot,
  };
};

/**
 * Builds the deductions shown after each turn: how many combinations remain, what
 * each slot can still want, eliminated items, items certainly still needed, and
 * items not tried yet.
 */
export const deduce = (
  input: DeductionInput,
  turnsPlayed: number
): Deductions => {
  const lines: Deduction[] = [{ count: input.count, kind: "count" }];
  const itemCount = input.marg[0]?.length ?? 0;
  if (turnsPlayed === 0) {
    lines.push({ items: itemCount, kind: "nothing-known" });
    return { eliminated: [], lines };
  }

  const slots = input.locked.map((_, slot) => slot);
  const openSlots = slots.filter((slot) => input.locked[slot] === OPEN_SLOT);
  const items = Array.from({ length: itemCount }, (_, item) => item);
  for (const slot of slots) {
    lines.push(slotLine(input, slot));
  }

  const eliminated =
    openSlots.length === 0
      ? []
      : items.filter((item) =>
          openSlots.every((slot) => input.marg[slot][item] === 0)
        );
  if (eliminated.length > 0) {
    lines.push({ items: eliminated, kind: "eliminated" });
  }

  for (const item of items) {
    const isRequired = ((input.reqMask >> item) & 1) === 1;
    const where = openSlots.filter((slot) => input.marg[slot][item] > 0);
    if (isRequired && where.length > 1) {
      lines.push({ item, kind: "wanted", slots: where });
    }
  }

  if (input.untested.length > 0) {
    lines.push({ items: [...input.untested], kind: "untested" });
  }
  return { eliminated, lines };
};
