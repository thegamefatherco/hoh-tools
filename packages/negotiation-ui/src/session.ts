import {
  AGE_COUNT,
  DIFFICULTIES,
  encountersOf,
  findEncounter,
  matchEncounter,
  resolveGame,
} from "@hoh-tools/negotiation/data";
import type {
  Difficulty,
  Encounter,
  PoolItem,
} from "@hoh-tools/negotiation/data";
import { codeFromColors, OPEN_SLOT } from "@hoh-tools/negotiation/engine";
import type { Color } from "@hoh-tools/negotiation/engine";
import type { SolveInput, SolveResult } from "@hoh-tools/negotiation/solver";

export const SLOT_OPTIONS = [3, 4, 5] as const;
export const TURN_OPTIONS = [1, 2, 3] as const;
const DEFAULT_SLOTS = 5;

export interface Setup {
  /** 0-based age index. */
  age: number;
  difficultyIndex: number;
  encounterKey: string;
  /** Number of characters. */
  slots: number;
  /** Turns chosen by the user, or null to use the game data. */
  turnsOverride: number | null;
}

export interface Turn {
  colors: Color[];
  guess: number[];
}

export type SolverOutcome = SolveResult | { error: string; status: "error" };

export interface SolveRequest {
  generation: number;
  input: SolveInput;
}

export interface Session {
  /** True while a solver request is outstanding. */
  busy: boolean;
  /** Colour marked on each slot for the current turn. */
  colors: (Color | null)[];
  history: Turn[];
  /** What the player placed this turn; null until a recommendation arrives. */
  placement: number[] | null;
  /** The latest solver request. Its generation identifies the only valid response. */
  request: SolveRequest;
  result: SolverOutcome | null;
  setup: Setup;
}

export type Action =
  | { index: number; type: "difficulty" }
  | { key: string; type: "encounter" }
  | { age: number; type: "age" }
  | { slots: number; type: "slots" }
  | { turns: number; type: "turns" }
  | { type: "new-game" }
  | { item: number; slot: number; type: "pick" }
  | { color: Color; slot: number; type: "color" }
  | { type: "all-green" }
  | { type: "submit" }
  | { type: "undo" }
  | { generation: number; result: SolverOutcome; type: "solved" };

export interface Game {
  difficulty: Difficulty;
  encounter: Encounter;
  pool: PoolItem[];
  /** Turns from the game data. */
  gameTurns: number;
  /** Turns in effect: the user's override, else the game data. */
  turns: number;
}

export type GameStatus = "lost" | "playing" | "won";

const clampIndex = (
  value: unknown,
  length: number,
  fallback: number
): number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value < length
    ? value
    : fallback;

const includesNumber = (
  options: readonly number[],
  value: unknown
): value is number => typeof value === "number" && options.includes(value);

/** Turns stored or partial setup into a valid one, falling back to defaults. */
export const normalizeSetup = (stored: Partial<Setup> = {}): Setup => {
  const difficultyIndex = clampIndex(
    stored.difficultyIndex,
    DIFFICULTIES.length,
    0
  );
  const difficulty = DIFFICULTIES[difficultyIndex];
  const wanted =
    typeof stored.encounterKey === "string"
      ? findEncounter(stored.encounterKey)
      : undefined;
  const encounter =
    wanted?.difficultyIndex === difficultyIndex
      ? wanted
      : matchEncounter(difficulty, wanted);
  return {
    age: clampIndex(stored.age, AGE_COUNT, 0),
    difficultyIndex,
    encounterKey: encounter?.key ?? "",
    slots: includesNumber(SLOT_OPTIONS, stored.slots)
      ? stored.slots
      : DEFAULT_SLOTS,
    turnsOverride: includesNumber(TURN_OPTIONS, stored.turnsOverride)
      ? stored.turnsOverride
      : null,
  };
};

/** The negotiation a setup points at, with its item pool for the player's age. */
export const describeGame = (setup: Setup): Game => {
  const difficulty = DIFFICULTIES[setup.difficultyIndex];
  const encounter =
    findEncounter(setup.encounterKey) ?? encountersOf(difficulty)[0];
  const game = resolveGame(encounter.gameId, setup.age);
  return {
    difficulty,
    encounter,
    gameTurns: game.turns,
    pool: game.pool,
    turns: setup.turnsOverride ?? game.turns,
  };
};

const isAllGreen = (colors: readonly (Color | null)[]): boolean =>
  colors.every((color) => color === "G");

export const gameStatus = (session: Session): GameStatus => {
  const last = session.history.at(-1);
  if (last !== undefined && isAllGreen(last.colors)) {
    return "won";
  }
  return session.history.length >= session.request.input.T ? "lost" : "playing";
};

const buildRequest = (
  setup: Setup,
  history: readonly Turn[],
  generation: number
): SolveRequest => {
  const game = describeGame(setup);
  return {
    generation,
    input: {
      T: game.turns,
      history: history.map((turn) => ({
        code: codeFromColors(turn.colors),
        guess: turn.guess,
      })),
      k: setup.slots,
      n: game.pool.length,
    },
  };
};

/**
 * Starts a fresh game for a setup. The previous result is dropped right away: it may
 * reference items that do not exist in the new pool.
 */
const restart = (setup: Setup, previousGeneration: number): Session => ({
  busy: true,
  colors: [],
  history: [],
  placement: null,
  request: buildRequest(setup, [], previousGeneration + 1),
  result: null,
  setup,
});

export const createSession = (stored?: Partial<Setup>): Session =>
  restart(normalizeSetup(stored), 0);

/** Recomputes for a changed history, keeping the last analysis on screen meanwhile. */
const replay = (session: Session, history: Turn[]): Session => ({
  ...session,
  busy: true,
  colors: [],
  history,
  placement: null,
  request: buildRequest(session.setup, history, session.request.generation + 1),
});

const lockedSlots = (session: Session): readonly number[] => {
  const { result } = session;
  return result !== null && "locked" in result ? result.locked : [];
};

const isLocked = (session: Session, slot: number): boolean =>
  (lockedSlots(session)[slot] ?? OPEN_SLOT) !== OPEN_SLOT;

const receive = (
  session: Session,
  generation: number,
  result: SolverOutcome
): Session => {
  // A response to anything but the latest request is stale: drop it.
  if (generation !== session.request.generation) {
    return session;
  }
  const settled = { ...session, busy: false, result };
  if (result.status !== "ok" || gameStatus(session) !== "playing") {
    return { ...settled, colors: [], placement: null };
  }
  return {
    ...settled,
    colors: result.locked.map((item) => (item === OPEN_SLOT ? null : "G")),
    placement: [...result.guess],
  };
};

const submit = (session: Session): Session => {
  const { placement, colors } = session;
  const marked = colors.filter((color) => color !== null);
  if (
    session.busy ||
    placement === null ||
    marked.length !== placement.length
  ) {
    return session;
  }
  return replay(session, [
    ...session.history,
    { colors: marked, guess: placement },
  ]);
};

const changeSetup = (session: Session, action: Action): Setup | null => {
  const { setup } = session;
  switch (action.type) {
    case "difficulty": {
      // Keep the same stage and encounter position in the new difficulty.
      return normalizeSetup({
        ...setup,
        difficultyIndex: action.index,
        turnsOverride: null,
      });
    }
    case "encounter": {
      return normalizeSetup({
        ...setup,
        encounterKey: action.key,
        turnsOverride: null,
      });
    }
    case "age": {
      return normalizeSetup({ ...setup, age: action.age, turnsOverride: null });
    }
    case "slots": {
      return normalizeSetup({ ...setup, slots: action.slots });
    }
    case "turns": {
      return normalizeSetup({ ...setup, turnsOverride: action.turns });
    }
    case "new-game": {
      return setup;
    }
    default: {
      return null;
    }
  }
};

const editTurn = (session: Session, action: Action): Session => {
  const { placement } = session;
  if (placement === null) {
    return session;
  }
  switch (action.type) {
    case "pick": {
      const isValidItem =
        action.item >= 0 && action.item < session.request.input.n;
      if (isLocked(session, action.slot) || !isValidItem) {
        return session;
      }
      return {
        ...session,
        placement: placement.with(action.slot, action.item),
      };
    }
    case "color": {
      if (isLocked(session, action.slot) && action.color !== "G") {
        return session;
      }
      return {
        ...session,
        colors: session.colors.with(action.slot, action.color),
      };
    }
    case "all-green": {
      return { ...session, colors: placement.map((): Color => "G") };
    }
    default: {
      return session;
    }
  }
};

export const reduce = (session: Session, action: Action): Session => {
  const setup = changeSetup(session, action);
  if (setup !== null) {
    return restart(setup, session.request.generation);
  }
  switch (action.type) {
    case "solved": {
      return receive(session, action.generation, action.result);
    }
    case "submit": {
      return submit(session);
    }
    case "undo": {
      return session.history.length === 0
        ? session
        : replay(session, session.history.slice(0, -1));
    }
    default: {
      return editTurn(session, action);
    }
  }
};
