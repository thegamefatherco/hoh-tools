/* oxlint-disable no-bitwise -- reqMask is a bitmask of items */
import {
  allSecrets,
  bestTwoTurnGuess,
  decode,
  filterCandidates,
  guessFromPattern,
  lockedAfter,
  makeSpace,
  marginals,
  OPEN_SLOT,
} from "./engine.ts";
import type { Space } from "./engine.ts";
import { pickOpening } from "./openings.ts";
import type { OpeningTable } from "./openings.ts";

export interface HistoryEntry {
  /** Feedback code, see `codeFromColors`. */
  code: number;
  /** Item placed in each slot. */
  guess: number[];
}

export interface SolveInput {
  /** Total turns. */
  T: number;
  /** Time budget of the exhaustive search in milliseconds. */
  budgetMs?: number;
  history: HistoryEntry[];
  /** Slots. */
  k: number;
  /** Items in the pool. */
  n: number;
  openings?: OpeningTable;
}

export type SolveMethod = "final" | "search" | "search-approx" | "table";

interface Analysis {
  /** Number of combinations still consistent with the history. */
  count: number;
  /** Item each slot is locked to, or -1 while open. */
  locked: number[];
  /** marg[slot][item] = candidates in which that slot wants that item. */
  marg: number[][];
  /** Bitmask of items every candidate still needs in some open slot. */
  reqMask: number;
  /** Up to 12 candidates. */
  sample: number[][];
  turnsLeft: number;
  /** Items that appear in no guess so far. */
  untested: number[];
}

export interface SolveOk extends Analysis {
  /** Opening only: every pattern, best first. */
  alternatives: { p: number; pat: string }[] | null;
  /** Recommended placement. */
  guess: number[];
  method: SolveMethod;
  /** Chance this turn is the full solve. */
  pNow: number;
  /** Chance to clear all slots from here. */
  pWin: number;
  status: "ok";
  /** True when the search ran out of time: best found, not proven optimal. */
  timedOut: boolean;
}

export interface SolveOver extends Analysis {
  status: "over";
}

export interface SolveInconsistent {
  count: 0;
  status: "inconsistent";
  turnsLeft: number;
}

export type SolveResult = SolveInconsistent | SolveOk | SolveOver;

const DEFAULT_BUDGET_MS = 15_000;
const SAMPLE_SIZE = 12;
const TWO_TURNS = 2;

const spaces = new Map<string, Space>();

const spaceFor = (n: number, k: number): Space => {
  const key = `${n}:${k}`;
  const cached = spaces.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const space = makeSpace(n, k);
  spaces.set(key, space);
  return space;
};

const untestedItems = (
  n: number,
  history: readonly HistoryEntry[]
): number[] => {
  const seen = new Set(history.flatMap((turn) => turn.guess));
  const untested: number[] = [];
  for (let item = 0; item < n; item += 1) {
    if (!seen.has(item)) {
      untested.push(item);
    }
  }
  return untested;
};

/** Items that appear in an open slot of every candidate. */
const requiredMask = (
  space: Space,
  candidates: Int32Array,
  locked: readonly number[]
): number => {
  const { k, n, digits } = space;
  let required = (1 << n) - 1;
  for (const candidate of candidates) {
    if (required === 0) {
      break;
    }
    let present = 0;
    for (let slot = 0; slot < k; slot += 1) {
      if (locked[slot] === OPEN_SLOT) {
        present |= 1 << digits[candidate * k + slot];
      }
    }
    required &= present;
  }
  return required;
};

/**
 * With one turn left every candidate is equally likely to be the secret, so pick the
 * one that maximises expected greens; ties take the first in candidate order.
 */
const finalPick = (
  space: Space,
  candidates: Int32Array,
  marg: number[][]
): number[] => {
  const { k, digits } = space;
  let bestScore = -1;
  let [best] = candidates;
  for (const candidate of candidates) {
    let score = 0;
    for (let slot = 0; slot < k; slot += 1) {
      score += marg[slot][digits[candidate * k + slot]];
    }
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return decode(space, best);
};

/**
 * Recommends the placement that maximises the chance of clearing the negotiation,
 * by exhaustive search over every combination still possible.
 */
export const solve = (input: SolveInput): SolveResult => {
  const { n, k, T, history, openings, budgetMs = DEFAULT_BUDGET_MS } = input;
  const space = spaceFor(n, k);
  const turnsLeft = T - history.length;

  let candidates = allSecrets(space);
  let locked = Array.from({ length: k }, () => OPEN_SLOT);
  for (const turn of history) {
    candidates = filterCandidates(space, candidates, turn.guess, turn.code);
    locked = lockedAfter(space, turn.guess, turn.code, locked);
  }
  if (candidates.length === 0) {
    return { count: 0, status: "inconsistent", turnsLeft };
  }

  const marg = marginals(space, candidates);
  const untested = untestedItems(n, history);
  const analysis: Analysis = {
    count: candidates.length,
    locked,
    marg,
    reqMask: requiredMask(space, candidates, locked),
    sample: [...candidates.subarray(0, SAMPLE_SIZE)].map((candidate) =>
      decode(space, candidate)
    ),
    turnsLeft,
    untested,
  };

  if (turnsLeft <= 0) {
    return { ...analysis, status: "over" };
  }

  const pCandidate = 1 / candidates.length;
  if (turnsLeft === 1) {
    return {
      ...analysis,
      alternatives: null,
      guess: finalPick(space, candidates, marg),
      method: "final",
      pNow: pCandidate,
      pWin: pCandidate,
      status: "ok",
      timedOut: false,
    };
  }

  const opening =
    history.length === 0 ? pickOpening(openings, k, n, turnsLeft) : null;
  if (opening !== null) {
    return {
      ...analysis,
      alternatives: opening.alternatives,
      guess: guessFromPattern(opening.best.pat.split("+").map(Number)),
      method: "table",
      pNow: 1 / space.size,
      pWin: opening.chance,
      status: "ok",
      timedOut: false,
    };
  }

  const found = bestTwoTurnGuess(space, candidates, locked, untested, {
    candidateSet: new Set(candidates),
    deadline: Date.now() + budgetMs,
  });
  return {
    ...analysis,
    alternatives: null,
    guess: found.guess,
    // More than 2 turns left with a history cannot happen for T <= 3; the 2-turn search is a lower bound there.
    method: turnsLeft === TWO_TURNS ? "search" : "search-approx",
    pNow: found.isCandidate ? pCandidate : 0,
    pWin: found.wins / candidates.length,
    status: "ok",
    timedOut: found.timedOut,
  };
};
