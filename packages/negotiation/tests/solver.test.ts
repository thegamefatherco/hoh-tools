import { describe, expect, test } from "bun:test";

import openingsFixture from "../fixtures/openings_expected.json" with { type: "json" };
import statesFixture from "../fixtures/solve_states.json" with { type: "json" };
import {
  codeFromColors,
  feedbackCode,
  makeSpace,
  patternOf,
} from "../src/engine.ts";
import type { Color } from "../src/engine.ts";
import { OPENINGS, clearChance } from "../src/openings.ts";
import { solve } from "../src/solver.ts";
import type { HistoryEntry } from "../src/solver.ts";

interface ExpectedState {
  count: number;
  guess?: number[];
  locked?: number[];
  marg?: number[][];
  method?: string;
  pNow?: number;
  reqMask?: number;
  status: string;
  untested?: number[];
  wins?: number;
}

const SLOTS = 5;
const TURNS = 3;
const GAMES_PER_POOL_SIZE = 2000;
const SIMULATED_POOL_SIZES = [4, 5, 6, 7, 8];

const toHistory = (
  turns: { colors: string; guess: number[] }[]
): HistoryEntry[] =>
  turns.map((turn) => ({
    code: codeFromColors([...turn.colors] as Color[]),
    guess: turn.guess,
  }));

describe("openings", () => {
  test("matches every expected first move", () => {
    expect(openingsFixture.cases.length).toBe(54);
    for (const fixture of openingsFixture.cases) {
      const { n, k, T } = fixture;
      const result = solve({ T, history: [], k, n, openings: OPENINGS });
      if (result.status !== "ok") {
        throw new Error(`n=${n} k=${k} T=${T}: status ${result.status}`);
      }
      expect({
        count: result.count,
        method: result.method as string,
        pNow: result.pNow,
        pWin: result.pWin,
        pattern: patternOf(result.guess),
      }).toEqual({
        count: fixture.count,
        method: fixture.method,
        pNow: expect.closeTo(fixture.pNow, 5),
        pWin: fixture.pWin,
        pattern: patternOf(fixture.guess),
      });
      expect(result.guess).toEqual(fixture.guess);
    }
  });

  test("clear chances for 5 slots and 3 turns", () => {
    const percents = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
      ((clearChance(SLOTS, n, TURNS) ?? 0) * 100).toFixed(1)
    );
    expect(percents).toEqual([
      "100.0",
      "100.0",
      "95.1",
      "83.1",
      "60.0",
      "36.0",
      "22.0",
      "12.7",
      "7.8",
    ]);
  });
});

describe("solver states", () => {
  for (const fixture of statesFixture.cases) {
    test(fixture.note, () => {
      const expected: ExpectedState = fixture.expected;
      const result = solve({
        T: fixture.T,
        history: toHistory(fixture.history),
        k: fixture.k,
        n: fixture.n,
        openings: OPENINGS,
      });
      expect<string>(result.status).toBe(expected.status);
      expect(result.count).toBe(expected.count);
      if (result.status === "inconsistent") {
        return;
      }
      expect(result.locked).toEqual(expected.locked ?? []);
      expect(result.untested).toEqual(expected.untested ?? []);
      expect(result.reqMask).toBe(expected.reqMask ?? -1);
      expect(result.marg).toEqual(expected.marg ?? []);
      if (result.status === "ok") {
        expect(Math.round(result.pWin * result.count)).toBe(
          expected.wins ?? -1
        );
        expect(result.pNow).toBeCloseTo(expected.pNow ?? -1, 10);
        expect<string>(result.method).toBe(expected.method ?? "");
        expect(result.timedOut).toBe(false);
        expect(result.guess).toEqual(expected.guess ?? []);
      }
    });
  }
});

// The policy is deterministic, so identical positions are solved once.
const solved = new Map<string, number[]>();

const recommend = (n: number, history: HistoryEntry[]): number[] => {
  const key = JSON.stringify([n, history]);
  const cached = solved.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const result = solve({ T: TURNS, history, k: SLOTS, n, openings: OPENINGS });
  if (result.status !== "ok") {
    throw new Error(`solver status ${result.status}`);
  }
  solved.set(key, result.guess);
  return result.guess;
};

const playGame = (n: number, secret: number): boolean => {
  const space = makeSpace(n, SLOTS);
  const history: HistoryEntry[] = [];
  for (let turn = 0; turn < TURNS; turn += 1) {
    const guess = recommend(n, history);
    const code = feedbackCode(space, guess, secret);
    if (code === 0) {
      return true;
    }
    history.push({ code, guess });
  }
  return false;
};

describe("simulation", () => {
  for (const n of SIMULATED_POOL_SIZES) {
    test(`${n} items: win rate matches the predicted clear chance`, () => {
      const predicted = clearChance(SLOTS, n, TURNS) ?? 0;
      let wins = 0;
      for (let game = 0; game < GAMES_PER_POOL_SIZE; game += 1) {
        if (playGame(n, Math.floor(Math.random() * n ** SLOTS))) {
          wins += 1;
        }
      }
      const rate = wins / GAMES_PER_POOL_SIZE;
      const sigma = Math.sqrt(
        (predicted * (1 - predicted)) / GAMES_PER_POOL_SIZE
      );
      expect(Math.abs(rate - predicted)).toBeLessThanOrEqual(
        3.5 * sigma + 0.005
      );
    }, 120_000);
  }
});
