import { describe, expect, test } from "bun:test";

import { deduce } from "../src/deductions.ts";
import { codeFromColors } from "../src/engine.ts";
import {
  describePattern,
  formatCount,
  formatFactor,
  formatPercent,
  letterOf,
} from "../src/format.ts";
import { OPENINGS } from "../src/openings.ts";
import { solve } from "../src/solver.ts";

describe("format", () => {
  test("percentages", () => {
    expect(
      [0, 0.0001, 0.0779, 0.5, 0.831, 0.9996, 1].map(formatPercent)
    ).toEqual(["0%", "<0.1%", "7.8%", "50%", "83%", "100%", "100%"]);
  });

  test("letters, counts and factors", () => {
    expect([letterOf(0), letterOf(9)]).toEqual(["A", "J"]);
    expect(formatCount(100_000)).toBe("100,000");
    expect(formatFactor(1.55)).toBe("×1.55");
  });

  test("opening patterns", () => {
    expect(["1+1+1+1+1", "2+1+1+1", "3+2", "5"].map(describePattern)).toEqual([
      "all different",
      "2 of one item, rest different",
      "3 of one item, 2 of one item",
      "5 of one item",
    ]);
  });
});

describe("deductions", () => {
  test("before the first turn nothing is known", () => {
    const result = solve({ T: 3, history: [], k: 5, n: 6, openings: OPENINGS });
    if (result.status !== "ok") {
      throw new Error(result.status);
    }
    expect(deduce(result, 0)).toEqual({
      eliminated: [],
      lines: [
        { count: 7776, kind: "count" },
        { items: 6, kind: "nothing-known" },
      ],
    });
  });

  test("after a turn: solved slots, options, eliminated, wanted and untested items", () => {
    // Secret 0,1,1,2,0 with 4 items: slot 1 green, B wanted elsewhere, C wanted elsewhere.
    const guess = [0, 0, 1, 1, 2];
    const result = solve({
      T: 3,
      history: [{ code: codeFromColors(["G", "R", "G", "O", "O"]), guess }],
      k: 5,
      n: 4,
      openings: OPENINGS,
    });
    if (result.status !== "ok") {
      throw new Error(result.status);
    }
    const { lines, eliminated } = deduce(result, 1);
    expect(lines[0]).toEqual({ count: result.count, kind: "count" });
    expect(lines.slice(1, 6).map((line) => line.kind)).toEqual([
      "slot-solved",
      "slot-options",
      "slot-solved",
      "slot-options",
      "slot-options",
    ]);
    expect(lines[1]).toEqual({ item: 0, kind: "slot-solved", slot: 0 });
    expect(lines[3]).toEqual({ item: 1, kind: "slot-solved", slot: 2 });
    // A was red in slot 2 while A is green in slot 1: no open slot wants A.
    expect(eliminated).toEqual([0]);
    expect(lines).toContainEqual({ items: [0], kind: "eliminated" });
    expect(lines).toContainEqual({ items: [3], kind: "untested" });
    const wanted = lines.filter((line) => line.kind === "wanted");
    expect(wanted.map((line) => line.item)).toEqual([1, 2]);
    for (const line of lines) {
      if (line.kind === "slot-options") {
        const total = line.options.reduce(
          (sum, option) => sum + option.probability,
          0
        );
        expect(total).toBeCloseTo(1, 10);
        expect(line.ruledOut).toContain(0);
      }
    }
  });
});
