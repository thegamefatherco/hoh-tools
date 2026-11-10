/**
 * Precomputes the exact value of every first move so the app never runs the expensive
 * 3-turn search at runtime.
 *
 * For each slot count k and pool size n, an opening is described by how many times each
 * item repeats (an integer partition of k). By symmetry the concrete items do not matter.
 *
 * Usage: bun scripts/precompute-openings.ts [--check]
 *   --check  compare against src/generated/openings.json instead of overwriting it
 * Runtime: about a minute or two on one core, dominated by k=5 with 9-10 items.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  allSecrets,
  countClasses,
  evalThreeTurns,
  guessFromPattern,
  makeSpace,
  OPEN_SLOT,
  partitionsOf,
} from "../src/engine.ts";
import type { OpeningRow, OpeningTable } from "../src/openings.ts";

const SLOT_COUNTS = [3, 4, 5];
const MIN_ITEMS = 2;
const MAX_ITEMS = 10;
const DECIMALS = 5;
const OUT_FILE = path.join(
  import.meta.dirname,
  "..",
  "src",
  "generated",
  "openings.json"
);

const round = (value: number): number => Number(value.toFixed(DECIMALS));

/** Every opening pattern for k slots and n items with its 2-turn and 3-turn clear chance. */
export const computeOpenings = (k: number, n: number): OpeningRow[] => {
  const space = makeSpace(n, k);
  const secrets = allSecrets(space);
  const open = Array.from({ length: k }, () => OPEN_SLOT);
  return partitionsOf(k, n).map((pattern): OpeningRow => {
    const guess = guessFromPattern(pattern);
    const used = new Set(guess);
    const untested: number[] = [];
    for (let item = 0; item < n; item += 1) {
      if (!used.has(item)) {
        untested.push(item);
      }
    }
    const twoTurnWins = countClasses(
      space,
      secrets,
      guess,
      new Int32Array(space.codeCount),
      1
    );
    const threeTurnWins = evalThreeTurns(space, secrets, guess, open, untested);
    return {
      p2: round(twoTurnWins / space.size),
      p3: round(threeTurnWins / space.size),
      pat: pattern.join("+"),
    };
  });
};

const main = async (): Promise<void> => {
  const table: OpeningTable = {};
  const started = Date.now();
  for (const k of SLOT_COUNTS) {
    const forSlots: Record<string, OpeningRow[]> = {};
    for (let n = MIN_ITEMS; n <= MAX_ITEMS; n += 1) {
      const rows = computeOpenings(k, n);
      forSlots[String(n)] = rows;
      const [best] = rows.toSorted((left, right) => right.p3 - left.p3);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      process.stdout.write(
        `k=${k} n=${n} best ${best.pat} p3=${best.p3} [${seconds}s]\n`
      );
    }
    table[String(k)] = forSlots;
  }

  if (process.argv.includes("--check")) {
    const shipped: unknown = JSON.parse(await readFile(OUT_FILE, "utf-8"));
    if (!isDeepStrictEqual(shipped, table)) {
      throw new Error(
        "Computed opening table differs from src/generated/openings.json"
      );
    }
    process.stdout.write("openings match src/generated/openings.json\n");
    return;
  }
  const output = JSON.stringify(table);
  await writeFile(OUT_FILE, `${output}\n`);
  process.stdout.write(`openings -> ${OUT_FILE}\n`);
};

if (import.meta.main) {
  await main();
}
