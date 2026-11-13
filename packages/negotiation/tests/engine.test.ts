import { describe, expect, test } from "bun:test";

import feedbackFixture from "../fixtures/feedback.json" with { type: "json" };
import {
  allSecrets,
  codeFromColors,
  colorsFromCode,
  encode,
  feedbackCode,
  filterCandidates,
  guessFromPattern,
  makeSpace,
  partitionsOf,
  patternOf,
} from "../src/engine.ts";
import type { Color } from "../src/engine.ts";

const toColors = (text: string): Color[] => [...text] as Color[];

describe("feedback", () => {
  test("matches every fixture case", () => {
    expect(feedbackFixture.cases.length).toBe(311);
    for (const fixture of feedbackFixture.cases) {
      const space = makeSpace(fixture.n, fixture.k);
      const code = feedbackCode(
        space,
        fixture.guess,
        encode(space, fixture.secret)
      );
      expect({
        code,
        colors: colorsFromCode(code, fixture.k).join(""),
        note: fixture.note,
      }).toEqual({
        code: fixture.code,
        colors: fixture.colors,
        note: fixture.note,
      });
    }
  });

  test("colour codes round-trip", () => {
    expect(codeFromColors(toColors("GGGGG"))).toBe(0);
    expect(codeFromColors(toColors("OGR"))).toBe(1 + 2 * 9);
    expect(colorsFromCode(19, 3).join("")).toBe("OGR");
  });
});

describe("filtering", () => {
  test("keeps the secret and only consistent combinations", () => {
    const space = makeSpace(6, 5);
    const guess = [0, 1, 1, 4, 5];
    for (const secret of [0, 17, 1234, 7775]) {
      const code = feedbackCode(space, guess, secret);
      const kept = filterCandidates(space, allSecrets(space), guess, code);
      expect(kept.includes(secret)).toBe(true);
      expect(
        kept.every(
          (candidate) => feedbackCode(space, guess, candidate) === code
        )
      ).toBe(true);
      expect([...kept]).toEqual(
        [...kept].toSorted((left, right) => left - right)
      );
    }
  });
});

describe("patterns", () => {
  test("partitions of 5 with at most 3 parts", () => {
    expect(partitionsOf(5, 3).map((parts) => parts.join("+"))).toEqual([
      "5",
      "4+1",
      "3+2",
      "3+1+1",
      "2+2+1",
    ]);
  });

  test("pattern to guess and back", () => {
    expect(guessFromPattern([2, 1, 1, 1])).toEqual([0, 0, 1, 2, 3]);
    expect(patternOf([3, 0, 3, 1, 2])).toBe("2+1+1+1");
  });
});
