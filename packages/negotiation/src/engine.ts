/* oxlint-disable no-bitwise -- item and slot sets are bitmasks; this is the hot path of the search */
/**
 * Exact engine for the Treasure Hunt negotiation mini-game.
 *
 * Feedback for a guess against a secret:
 *   GREEN   guess[i] == secret[i]
 *   ORANGE  not green, and some slot that is NOT green this turn wants guess[i]
 *   RED     otherwise
 *
 * Prior: every slot independently and uniformly wants one of the n items, so every
 * secret consistent with the history is equally likely.
 */

export type Color = "G" | "O" | "R";

export interface Space {
  /** Number of feedback codes, 3^k. */
  codeCount: number;
  /** Digits of every secret: digits[secret * k + slot]. Slot 0 is least significant. */
  digits: Uint8Array;
  /** Slots. */
  k: number;
  /** Items in the pool. */
  n: number;
  /** Number of secrets, n^k. */
  size: number;
}

export interface BestGuess {
  guess: number[];
  isCandidate: boolean;
  timedOut: boolean;
  /** Number of candidates for which optimal play clears with 2 turns left. */
  wins: number;
}

export interface SearchOptions {
  /** Candidates as a set of secret indices, used for the "prefer a candidate" tie-break. */
  candidateSet?: Set<number>;
  /** Epoch milliseconds after which the search returns the best guess found so far. */
  deadline?: number;
}

/** Feedback code of an all-green turn. */
export const ALL_GREEN = 0;
export const OPEN_SLOT = -1;

const CODE_GREEN = 0;
const CODE_ORANGE = 1;
const CODE_RED = 2;
const COLOR_BASE = 3;
const COLORS: readonly Color[] = ["G", "O", "R"];
/** The time budget is checked once every this many guesses. */
const DEADLINE_CHECK_INTERVAL = 256;

export const makeSpace = (n: number, k: number): Space => {
  const size = n ** k;
  const digits = new Uint8Array(size * k);
  for (let secret = 0; secret < size; secret += 1) {
    let rest = secret;
    for (let slot = 0; slot < k; slot += 1) {
      digits[secret * k + slot] = rest % n;
      rest = Math.floor(rest / n);
    }
  }
  return { codeCount: COLOR_BASE ** k, digits, k, n, size };
};

/** Feedback code: base 3, slot i has weight 3^i; G=0, O=1, R=2. */
export const feedbackCode = (
  space: Space,
  guess: ArrayLike<number>,
  secret: number
): number => {
  const { k, digits } = space;
  const offset = secret * k;
  let wanted = 0;
  let green = 0;
  for (let slot = 0; slot < k; slot += 1) {
    const want = digits[offset + slot];
    if (guess[slot] === want) {
      green |= 1 << slot;
    } else {
      wanted |= 1 << want;
    }
  }
  let code = 0;
  let weight = 1;
  for (let slot = 0; slot < k; slot += 1) {
    if ((green & (1 << slot)) === 0) {
      const isWanted = ((wanted >> guess[slot]) & 1) === 1;
      code += weight * (isWanted ? CODE_ORANGE : CODE_RED);
    }
    weight *= COLOR_BASE;
  }
  return code;
};

export const codeFromColors = (colors: Iterable<Color>): number => {
  let code = 0;
  let weight = 1;
  for (const color of colors) {
    code += weight * COLORS.indexOf(color);
    weight *= COLOR_BASE;
  }
  return code;
};

export const colorsFromCode = (code: number, k: number): Color[] => {
  const colors: Color[] = [];
  let rest = code;
  for (let slot = 0; slot < k; slot += 1) {
    colors.push(COLORS[rest % COLOR_BASE]);
    rest = Math.floor(rest / COLOR_BASE);
  }
  return colors;
};

export const encode = (space: Space, guess: ArrayLike<number>): number => {
  let secret = 0;
  let weight = 1;
  for (let slot = 0; slot < space.k; slot += 1) {
    secret += guess[slot] * weight;
    weight *= space.n;
  }
  return secret;
};

export const decode = (space: Space, secret: number): number[] => {
  const start = secret * space.k;
  return [...space.digits.subarray(start, start + space.k)];
};

export const allSecrets = (space: Space): Int32Array => {
  const secrets = new Int32Array(space.size);
  for (let secret = 0; secret < space.size; secret += 1) {
    secrets[secret] = secret;
  }
  return secrets;
};

/** Candidates that give `code` under `guess`, in the same (ascending) order. */
export const filterCandidates = (
  space: Space,
  candidates: Int32Array,
  guess: ArrayLike<number>,
  code: number
): Int32Array => {
  const kept = new Int32Array(candidates.length);
  let count = 0;
  for (const candidate of candidates) {
    if (feedbackCode(space, guess, candidate) === code) {
      kept[count] = candidate;
      count += 1;
    }
  }
  return kept.slice(0, count);
};

/**
 * Number of distinct feedback codes `guess` produces over `candidates`.
 * `stamp` has one entry per code; `generation` must be unique per call.
 */
export const countClasses = (
  space: Space,
  candidates: Int32Array,
  guess: ArrayLike<number>,
  stamp: Int32Array,
  generation: number
): number => {
  let count = 0;
  for (const candidate of candidates) {
    const code = feedbackCode(space, guess, candidate);
    if (stamp[code] !== generation) {
      stamp[code] = generation;
      count += 1;
    }
  }
  return count;
};

/**
 * Enumerates guesses that keep locked slots (locked[i] = item, or -1) and use the
 * interchangeable untested items in one canonical order only.
 * Depth-first over slots; at each free slot tested items ascending, then untested
 * items already introduced, then the next new one. `visit` returns whether to continue.
 */
export const forEachGuess = (
  space: Space,
  locked: readonly number[],
  untested: readonly number[],
  visit: (guess: number[]) => boolean
): void => {
  const { k, n } = space;
  const untestedSet = new Set(untested);
  const tested: number[] = [];
  for (let item = 0; item < n; item += 1) {
    if (!untestedSet.has(item)) {
      tested.push(item);
    }
  }
  const guess = Array.from({ length: k }, () => 0);
  let stopped = false;

  const walk = (slot: number, nextUntested: number): void => {
    if (slot === k) {
      stopped = !visit(guess);
      return;
    }
    const lockedItem = locked[slot];
    if (lockedItem >= 0) {
      guess[slot] = lockedItem;
      walk(slot + 1, nextUntested);
      return;
    }
    for (const item of tested) {
      guess[slot] = item;
      walk(slot + 1, nextUntested);
      if (stopped) {
        return;
      }
    }
    const lastUntested = Math.min(nextUntested, untested.length - 1);
    for (let index = 0; index <= lastUntested; index += 1) {
      guess[slot] = untested[index];
      walk(slot + 1, index === nextUntested ? nextUntested + 1 : nextUntested);
      if (stopped) {
        return;
      }
    }
  };
  walk(0, 0);
};

/**
 * Best guess with 2 turns left: the one producing the most distinct feedback codes.
 * Ties prefer a guess that is itself a candidate, then the first in enumeration order.
 */
export const bestTwoTurnGuess = (
  space: Space,
  candidates: Int32Array,
  locked: readonly number[],
  untested: readonly number[],
  options: SearchOptions = {}
): BestGuess => {
  const { candidateSet, deadline = Number.POSITIVE_INFINITY } = options;
  const stamp = new Int32Array(space.codeCount);
  let generation = 0;
  let best: number[] = [];
  let bestWins = -1;
  let bestIsCandidate = false;
  let timedOut = false;

  forEachGuess(space, locked, untested, (guess) => {
    generation += 1;
    if (generation % DEADLINE_CHECK_INTERVAL === 0 && Date.now() > deadline) {
      timedOut = true;
      return false;
    }
    const wins = countClasses(space, candidates, guess, stamp, generation);
    if (wins >= bestWins) {
      const isCandidate = candidateSet?.has(encode(space, guess)) ?? false;
      if (wins > bestWins || (isCandidate && !bestIsCandidate)) {
        bestWins = wins;
        best = [...guess];
        bestIsCandidate = isCandidate;
      }
    }
    // A perfect split that can also win this turn cannot be beaten.
    return !(bestWins === candidates.length && bestIsCandidate);
  });

  return {
    guess: best,
    isCandidate: bestIsCandidate,
    timedOut,
    wins: bestWins,
  };
};

/** Splits candidates by the feedback code they give under `guess`. */
export const partition = (
  space: Space,
  candidates: Int32Array,
  guess: ArrayLike<number>
): Map<number, Int32Array> => {
  const buckets = new Map<number, number[]>();
  for (const candidate of candidates) {
    const code = feedbackCode(space, guess, candidate);
    const bucket = buckets.get(code);
    if (bucket === undefined) {
      buckets.set(code, [candidate]);
    } else {
      bucket.push(candidate);
    }
  }
  const parts = new Map<number, Int32Array>();
  for (const [code, bucket] of buckets) {
    parts.set(code, Int32Array.from(bucket));
  }
  return parts;
};

/** Locked slots after a turn: a slot is locked to the item it showed green with. */
export const lockedAfter = (
  space: Space,
  guess: ArrayLike<number>,
  code: number,
  previous?: readonly number[]
): number[] => {
  const locked = previous
    ? [...previous]
    : Array.from({ length: space.k }, () => OPEN_SLOT);
  let rest = code;
  for (let slot = 0; slot < space.k; slot += 1) {
    if (rest % COLOR_BASE === CODE_GREEN) {
      locked[slot] = guess[slot];
    }
    rest = Math.floor(rest / COLOR_BASE);
  }
  return locked;
};

/** Candidates won with 3 turns left when the first guess is `guess`. */
export const evalThreeTurns = (
  space: Space,
  candidates: Int32Array,
  guess: readonly number[],
  locked: readonly number[],
  untestedAfter: readonly number[]
): number => {
  let total = 0;
  for (const [code, group] of partition(space, candidates, guess)) {
    if (code === ALL_GREEN) {
      total += 1;
    } else {
      const groupLocked = lockedAfter(space, guess, code, locked);
      total += bestTwoTurnGuess(space, group, groupLocked, untestedAfter).wins;
    }
  }
  return total;
};

/** Integer partitions of k into at most `maxParts` parts, parts descending. */
export const partitionsOf = (k: number, maxParts: number): number[][] => {
  const result: number[][] = [];
  const parts: number[] = [];
  const walk = (remaining: number, largest: number): void => {
    if (remaining === 0) {
      if (parts.length <= maxParts) {
        result.push([...parts]);
      }
      return;
    }
    for (let part = Math.min(remaining, largest); part >= 1; part -= 1) {
      parts.push(part);
      walk(remaining - part, part);
      parts.pop();
    }
  };
  walk(k, k);
  return result;
};

/** Repeat pattern -> guess: part j gets item j, filling slots in order. */
export const guessFromPattern = (pattern: readonly number[]): number[] =>
  pattern.flatMap((size, item) => Array.from({ length: size }, () => item));

/** Repeat pattern of a guess, e.g. [0,0,1,2,3] -> "2+1+1+1". */
export const patternOf = (guess: readonly number[]): string => {
  const counts = new Map<number, number>();
  for (const item of guess) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.values()].toSorted((left, right) => right - left).join("+");
};

/** marg[slot][item] = number of candidates in which that slot wants that item. */
export const marginals = (space: Space, candidates: Int32Array): number[][] => {
  const { k, n, digits } = space;
  const counts = Array.from({ length: k }, () =>
    Array.from({ length: n }, () => 0)
  );
  for (const candidate of candidates) {
    const offset = candidate * k;
    for (let slot = 0; slot < k; slot += 1) {
      counts[slot][digits[offset + slot]] += 1;
    }
  }
  return counts;
};
