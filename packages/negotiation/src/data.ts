import { AGE_COUNT, AGE_LABELS } from "./ages.ts";
import type { GameBand, GameData, GiftRow } from "./gamedata-types.ts";
import gamedataJson from "./generated/gamedata.json" with { type: "json" };

export { AGE_COUNT, AGE_IDS, AGE_LABELS } from "./ages.ts";

/** A pool item resolved for one player age. */
export interface ResolvedGift {
  amount: number;
  /** Set when the gift is a good of an age that has no goods. */
  good?: { age: number; number: number };
  /** Full resource id (for example "resource.marble_bust"), or null when unresolved. */
  resourceId: string | null;
}

export interface PoolItem extends ResolvedGift {
  factor: number;
  giftId: string;
  /** Resource name used for the icon lookup, or null when there is none. */
  iconName: string | null;
  /** Display label: the resource id without the leading "resource.". */
  label: string;
}

export interface Encounter {
  difficultyIndex: number;
  /** 0-based encounter id within the stage. */
  encounterId: number;
  gameId: string;
  /** Unique within the data: "{difficultyIndex}-{stage}-{encounterId}". */
  key: string;
  section: number;
  /** 0-based stage. */
  stage: number;
}

export interface Stage {
  encounters: Encounter[];
  stage: number;
}

export interface Difficulty {
  /** 0-based difficulty. */
  difficulty: number;
  index: number;
  recommendedPower: number;
  stages: Stage[];
}

export interface ResolvedGame {
  pool: PoolItem[];
  turns: number;
}

const RESOURCE_PREFIX = "resource.";

// The JSON import widens the compact tuples to arrays; `scripts/build-data.ts` guarantees the shape.
const GAME_DATA = gamedataJson as unknown as GameData;

const GAME_BANDS = new Map<string, GameBand[]>(GAME_DATA.games);

/**
 * Every "when" list means "from this age onward": take the last row whose age is at
 * most the player's age, or the first row when none qualifies.
 */
const lookup = <Row extends { 0: number }>(
  rows: readonly Row[],
  age: number
): Row => {
  let [picked] = rows;
  for (const row of rows) {
    if (row[0] <= age) {
      picked = row;
    }
  }
  return picked;
};

const clampAge = (age: number): number =>
  Math.max(0, Math.min(AGE_COUNT - 1, age));

export const GIFT_IDS: readonly string[] = Object.keys(
  GAME_DATA.gifts
).toSorted();

export const DIFFICULTIES: readonly Difficulty[] = GAME_DATA.diffs.map(
  ([difficulty, recommendedPower, stages], index): Difficulty => ({
    difficulty,
    index,
    recommendedPower,
    stages: stages.map(([stage, encounters]) => ({
      encounters: encounters.map(([encounterId, section, gameIndex]) => ({
        difficultyIndex: index,
        encounterId,
        gameId: GAME_DATA.games[gameIndex][0],
        key: `${index}-${stage}-${encounterId}`,
        section,
        stage,
      })),
      stage,
    })),
  })
);

const resolveRow = (row: GiftRow, playerAge: number): ResolvedGift => {
  if (row[1] === "r") {
    return {
      amount: Number(row[3]),
      resourceId: `${RESOURCE_PREFIX}${row[2]}`,
    };
  }
  // The offset counts from the player's age, not from the age band of the row.
  const { 2: number, 3: offset, 4: amount } = row;
  const age = clampAge(playerAge + offset);
  const resourceId = GAME_DATA.goods[String(age)]?.[String(number)];
  if (resourceId === undefined) {
    return { amount: Number(amount), good: { age, number }, resourceId: null };
  }
  return { amount: Number(amount), resourceId };
};

/** What a gift is for a player of the given age (0-based age index). */
export const resolveGift = (
  giftId: string,
  playerAge: number
): ResolvedGift => {
  const rows = GAME_DATA.gifts[giftId];
  if (rows === undefined) {
    throw new Error(`Unknown gift ${giftId}`);
  }
  return resolveRow(lookup(rows, playerAge), playerAge);
};

const describe = (gift: ResolvedGift): Pick<PoolItem, "iconName" | "label"> => {
  if (gift.resourceId !== null) {
    const name = gift.resourceId.startsWith(RESOURCE_PREFIX)
      ? gift.resourceId.slice(RESOURCE_PREFIX.length)
      : gift.resourceId;
    return { iconName: name, label: name };
  }
  const { age = 0, number = 0 } = gift.good ?? {};
  return {
    iconName: null,
    label: `Good #${number} · ${AGE_LABELS[age]} (that age has no goods)`,
  };
};

/** Item pool and turns of a negotiation game for a player of the given age. */
export const resolveGame = (
  gameId: string,
  playerAge: number
): ResolvedGame => {
  const bands = GAME_BANDS.get(gameId);
  if (bands === undefined) {
    throw new Error(`Unknown negotiation game ${gameId}`);
  }
  const [, turns, gifts] = lookup(bands, playerAge);
  return {
    pool: gifts.map(([giftId, factor]): PoolItem => {
      const gift = resolveGift(giftId, playerAge);
      return { ...gift, ...describe(gift), factor, giftId };
    }),
    turns,
  };
};

/** Every negotiation encounter of a difficulty, in stage then export order. */
export const encountersOf = (difficulty: Difficulty): Encounter[] =>
  difficulty.stages.flatMap((stage) => stage.encounters);

/**
 * The encounter at the same stage and position in another difficulty, falling back
 * to that difficulty's first negotiation.
 */
export const matchEncounter = (
  difficulty: Difficulty,
  position?: { encounterId: number; stage: number }
): Encounter | undefined => {
  const all = encountersOf(difficulty);
  const same = all.find(
    (encounter) =>
      encounter.stage === position?.stage &&
      encounter.encounterId === position.encounterId
  );
  return same ?? all[0];
};

export const findEncounter = (key: string): Encounter | undefined =>
  DIFFICULTIES.flatMap(encountersOf).find((encounter) => encounter.key === key);

/**
 * Resource names of every icon the app can need: every gift of every reachable game
 * at every age.
 */
export const requiredIconNames = (): string[] => {
  const names = new Set<string>();
  const gameIds = new Set(
    DIFFICULTIES.flatMap(encountersOf).map((encounter) => encounter.gameId)
  );
  for (const gameId of gameIds) {
    for (let age = 0; age < AGE_COUNT; age += 1) {
      for (const item of resolveGame(gameId, age).pool) {
        if (item.iconName !== null) {
          names.add(item.iconName);
        }
      }
    }
  }
  return [...names].toSorted();
};
