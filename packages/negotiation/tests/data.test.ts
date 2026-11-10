import { describe, expect, test } from "bun:test";

import resolutionFixture from "../fixtures/data_resolution.json" with { type: "json" };
import referenceGamedata from "../fixtures/reference_gamedata.json" with { type: "json" };
import {
  AGE_IDS,
  DIFFICULTIES,
  GIFT_IDS,
  encountersOf,
  matchEncounter,
  requiredIconNames,
  resolveGame,
  resolveGift,
} from "../src/data.ts";
import gamedata from "../src/generated/gamedata.json" with { type: "json" };
import { clearChance } from "../src/openings.ts";

const SLOTS = 5;
const ageIndex = (id: string): number =>
  (AGE_IDS as readonly string[]).indexOf(id);

describe("data build", () => {
  test("generated data equals the reference extract", () => {
    expect(gamedata).toEqual(referenceGamedata);
  });

  test("11 difficulties with 19 negotiations each", () => {
    expect(DIFFICULTIES.length).toBe(11);
    expect(
      DIFFICULTIES.map((difficulty) => encountersOf(difficulty).length)
    ).toEqual(Array.from({ length: 11 }, () => 19));
  });
});

describe("resolution", () => {
  test("every gift at every age", () => {
    expect(Object.keys(resolutionFixture.giftSweep).toSorted()).toEqual([
      ...GIFT_IDS,
    ]);
    for (const [giftId, rows] of Object.entries(resolutionFixture.giftSweep)) {
      const resolved = AGE_IDS.map((age, index) => {
        const gift = resolveGift(giftId, index);
        const good = gift.good && {
          age: AGE_IDS[gift.good.age],
          number: gift.good.number,
        };
        return {
          age,
          resourceId: gift.resourceId,
          ...(good ? { good } : {}),
          amount: gift.amount,
        };
      });
      expect(resolved).toEqual(rows as typeof resolved);
    }
  });

  test("every encounter pool", () => {
    expect(resolutionFixture.encounters.length).toBe(313);
    for (const fixture of resolutionFixture.encounters) {
      const difficulty = DIFFICULTIES.find(
        (entry) => entry.difficulty === fixture.difficulty
      );
      const encounter = difficulty?.stages
        .find((stage) => stage.stage === fixture.stage)
        ?.encounters.find((entry) => entry.encounterId === fixture.encounterId);
      expect({
        gameId: encounter?.gameId,
        recommendedPower: difficulty?.recommendedPower,
        section: encounter?.section,
      }).toEqual({
        gameId: fixture.gameId,
        recommendedPower: fixture.recommendedPower,
        section: fixture.section,
      });
      const game = resolveGame(fixture.gameId, ageIndex(fixture.age));
      expect(game.turns).toBe(fixture.turns);
      expect(
        game.pool.map(({ giftId, factor, resourceId, amount }) => ({
          amount,
          factor,
          giftId,
          resourceId,
        }))
      ).toEqual(
        fixture.pool.map(({ giftId, factor, resourceId, amount }) => ({
          amount,
          factor,
          giftId,
          resourceId,
        }))
      );
    }
  });

  test("per-difficulty overview and clear chances", () => {
    const overview = DIFFICULTIES.map((difficulty) => {
      const stages = difficulty.stages.map((stage) => ({
        negotiations: stage.encounters.map((encounter) => {
          const game = resolveGame(encounter.gameId, 0);
          return {
            clearChance: clearChance(SLOTS, game.pool.length, game.turns),
            encounterId: encounter.encounterId,
            gameId: encounter.gameId,
            items: game.pool.length,
            section: encounter.section,
            turns: game.turns,
          };
        }),
        stage: stage.stage,
      }));
      const expectedClears = stages
        .flatMap((stage) => stage.negotiations)
        .reduce(
          (total, negotiation) => total + (negotiation.clearChance ?? 0),
          0
        );
      return {
        difficulty: difficulty.difficulty,
        expectedClears,
        recommendedPower: difficulty.recommendedPower,
        stages,
      };
    });
    expect(overview).toEqual(
      resolutionFixture.difficulties.map((difficulty) => ({
        ...difficulty,
        expectedClears: expect.closeTo(difficulty.expectedClears, 8),
      }))
    );
  });

  test("the largest pool any difficulty uses is 8 items", () => {
    const sizes = DIFFICULTIES.flatMap(encountersOf).map(
      (encounter) => resolveGame(encounter.gameId, 0).pool.length
    );
    expect(Math.max(...sizes)).toBe(8);
  });
});

describe("helpers", () => {
  test("67 icons are required", () => {
    expect(requiredIconNames().length).toBe(67);
  });

  test("matching an encounter across difficulties", () => {
    const [first, second] = DIFFICULTIES;
    const source = encountersOf(first).at(-1);
    const matched = matchEncounter(second, source);
    expect(matched?.difficultyIndex).toBe(1);
    expect({
      encounterId: matched?.encounterId,
      stage: matched?.stage,
    }).toEqual({
      encounterId: source?.encounterId,
      stage: source?.stage,
    });
    expect(matchEncounter(second, { encounterId: 999, stage: 999 })).toEqual(
      encountersOf(second)[0]
    );
  });
});
