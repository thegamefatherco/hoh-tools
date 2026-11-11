import { describe, expect, test } from "bun:test";

import { DIFFICULTIES, encountersOf } from "@hoh-tools/negotiation/data";
import {
  allSecrets,
  colorsFromCode,
  makeSpace,
  partition,
} from "@hoh-tools/negotiation/engine";
import { OPENINGS } from "@hoh-tools/negotiation/openings";
import { solve } from "@hoh-tools/negotiation/solver";

import {
  CHARACTERS,
  createSession,
  describeGame,
  gameStatus,
  reduce,
} from "./session";
import type { Action, Session } from "./session";

const FEUDAL_AGE = 8;
const DIFFICULTY_9 = 8;

/** Answers the session's outstanding request the way the worker would. */
const settle = (session: Session): Session =>
  reduce(session, {
    generation: session.request.generation,
    result: solve({ ...session.request.input, openings: OPENINGS }),
    type: "solved",
  });

const apply = (session: Session, ...actions: Action[]): Session => {
  let next = session;
  for (const action of actions) {
    next = reduce(next, action);
  }
  return next;
};

const encounterWithItems = (stage: number, items: number): string => {
  const found = encountersOf(DIFFICULTIES[DIFFICULTY_9]).find(
    (encounter) =>
      encounter.stage === stage &&
      describeGame({
        age: FEUDAL_AGE,
        difficultyIndex: DIFFICULTY_9,
        encounterKey: encounter.key,
      }).pool.length === items
  );
  if (found === undefined) {
    throw new Error(`No stage ${stage} encounter with ${items} items`);
  }
  return found.key;
};

const start = (): Session =>
  settle(
    createSession({
      age: FEUDAL_AGE,
      difficultyIndex: DIFFICULTY_9,
      encounterKey: encounterWithItems(2, 6),
    })
  );

describe("setup", () => {
  test("defaults and invalid stored values", () => {
    const session = createSession({
      age: 99,
      difficultyIndex: -1,
      encounterKey: "nope",
    });
    expect(session.setup).toEqual({
      age: 0,
      difficultyIndex: 0,
      encounterKey: encountersOf(DIFFICULTIES[0])[0].key,
    });
    expect(session.busy).toBe(true);
    expect(session.result).toBeNull();
  });

  test("changing difficulty keeps the stage and encounter position", () => {
    const { 2: third } = DIFFICULTIES;
    const source = encountersOf(DIFFICULTIES[0]).at(-1);
    const session = apply(
      createSession(),
      { key: source?.key ?? "", type: "encounter" },
      { index: third.index, type: "difficulty" }
    );
    const { encounter } = describeGame(session.setup);
    expect(encounter.difficultyIndex).toBe(third.index);
    expect({
      encounterId: encounter.encounterId,
      stage: encounter.stage,
    }).toEqual({
      encounterId: source?.encounterId ?? -1,
      stage: source?.stage ?? -1,
    });
  });

  test("every negotiation has 5 characters and the game's 3 turns", () => {
    const { input } = createSession().request;
    expect(input.k).toBe(CHARACTERS);
    expect(input.T).toBe(3);
  });
});

describe("stale results", () => {
  test("a setup change drops the previous result before the new one arrives", () => {
    const large = encounterWithItems(2, 6);
    const small = encounterWithItems(0, 3);
    const first = settle(
      createSession({
        age: FEUDAL_AGE,
        difficultyIndex: DIFFICULTY_9,
        encounterKey: large,
      })
    );
    expect(first.placement?.length).toBe(5);
    expect(first.request.input.n).toBe(6);

    const switched = reduce(first, { key: small, type: "encounter" });
    expect(switched).toMatchObject({
      busy: true,
      colors: [],
      history: [],
      placement: null,
      result: null,
    });
    expect(switched.request.input.n).toBe(3);
  });

  test("a response for an older request is ignored", () => {
    const large = encounterWithItems(2, 6);
    const small = encounterWithItems(0, 3);
    const first = createSession({
      age: FEUDAL_AGE,
      difficultyIndex: DIFFICULTY_9,
      encounterKey: large,
    });
    const switched = reduce(first, { key: small, type: "encounter" });
    const late = reduce(switched, {
      generation: first.request.generation,
      result: solve({ ...first.request.input, openings: OPENINGS }),
      type: "solved",
    });
    expect(late).toBe(switched);

    const settled = settle(late);
    expect(settled.busy).toBe(false);
    expect(Math.max(...(settled.placement ?? []))).toBeLessThan(3);
  });

  test("a solver error ends the busy state", () => {
    const session = createSession();
    const failed = reduce(session, {
      generation: session.request.generation,
      result: { error: "boom", status: "error" },
      type: "solved",
    });
    expect(failed).toMatchObject({ busy: false, placement: null });
    expect(failed.result?.status).toBe("error");
  });
});

describe("playing", () => {
  test("submit needs a colour on every slot", () => {
    const session = start();
    expect(reduce(session, { type: "submit" })).toBe(session);
    const marked = apply(
      session,
      { color: "R", slot: 0, type: "color" },
      { color: "O", slot: 1, type: "color" },
      { color: "G", slot: 2, type: "color" },
      { color: "R", slot: 3, type: "color" },
      { color: "R", slot: 4, type: "color" }
    );
    const submitted = reduce(marked, { type: "submit" });
    expect(submitted.history).toEqual([
      { colors: ["R", "O", "G", "R", "R"], guess: session.placement ?? [] },
    ]);
    expect(submitted.busy).toBe(true);
    expect(submitted.request.generation).toBe(session.request.generation + 1);
  });

  test("green slots lock: item and colour cannot change", () => {
    const session = start();
    const next = settle(
      apply(
        session,
        { color: "G", slot: 0, type: "color" },
        { color: "R", slot: 1, type: "color" },
        { color: "R", slot: 2, type: "color" },
        { color: "R", slot: 3, type: "color" },
        { color: "R", slot: 4, type: "color" },
        { type: "submit" }
      )
    );
    expect(next.colors).toEqual(["G", null, null, null, null]);
    const lockedItem = next.placement?.[0];
    const edited = apply(
      next,
      { item: 5, slot: 0, type: "pick" },
      { color: "R", slot: 0, type: "color" },
      { item: 5, slot: 1, type: "pick" }
    );
    expect(edited.placement?.[0]).toBe(lockedItem);
    expect(edited.colors[0]).toBe("G");
    expect(edited.placement?.[1]).toBe(5);
  });

  test("all green wins; undo returns to the previous turn", () => {
    const won = settle(
      apply(start(), { type: "all-green" }, { type: "submit" })
    );
    expect(gameStatus(won)).toBe("won");
    expect(won.placement).toBeNull();
    const undone = settle(reduce(won, { type: "undo" }));
    expect(gameStatus(undone)).toBe("playing");
    expect(undone.history).toEqual([]);
    expect(undone.placement).not.toBeNull();
  });

  test("running out of turns loses and reports the remaining combinations", () => {
    let session = start();
    const space = makeSpace(session.request.input.n, CHARACTERS);
    let candidates = allSecrets(space);
    // An adversary: answer every turn with the colours that keep the most combinations.
    while (gameStatus(session) === "playing") {
      const placement = session.placement ?? [];
      let largest: [number, Int32Array] = [0, new Int32Array()];
      for (const part of partition(space, candidates, placement)) {
        if (part[1].length > largest[1].length) {
          largest = part;
        }
      }
      const [code, kept] = largest;
      candidates = kept;
      const colors = colorsFromCode(code, CHARACTERS).map(
        (color, slot): Action => ({ color, slot, type: "color" })
      );
      session = settle(apply(session, ...colors, { type: "submit" }));
    }
    expect(gameStatus(session)).toBe("lost");
    expect(session.history).toHaveLength(3);
    expect(session.result).toMatchObject({
      count: candidates.length,
      status: "over",
    });
    expect(session.placement).toBeNull();
  });

  test("contradictory colours are reported as inconsistent", () => {
    const session = start();
    const [first] = session.placement ?? [];
    // Same item everywhere: orange is impossible when no other slot can differ from green.
    const sameItem = [1, 2, 3, 4].map((slot): Action => ({
      item: first,
      slot,
      type: "pick",
    }));
    const colors = [0, 1, 2, 3, 4].map((slot): Action => ({
      color: slot === 0 ? "O" : "R",
      slot,
      type: "color",
    }));
    const result = settle(
      apply(session, ...sameItem, ...colors, { type: "submit" })
    );
    expect(result.result?.status).toBe("inconsistent");
    expect(result.busy).toBe(false);
  });
});
