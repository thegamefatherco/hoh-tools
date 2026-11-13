/**
 * Compact game data extracted from the raw exports by `scripts/build-data.ts`.
 * The shape matches the reference implementation's `gamedata.json`.
 */

/** [ageIdx, "r", resourceName, amount] */
export type ResourceGiftRow = [number, "r", string, number | string];
/** [ageIdx, "g", goodNumber, ageOffset, amount] */
export type GoodGiftRow = [number, "g", number, number, number | string];
export type GiftRow = ResourceGiftRow | GoodGiftRow;

/** [giftId, factor] */
export type PoolEntry = [string, number];
/** [ageIdx, turns, pool] */
export type GameBand = [number, number, PoolEntry[]];
/** [gameId, bands] */
export type GameEntry = [string, GameBand[]];

/** [encounterId, section, gameIndex, encountersInStage] */
export type EncounterEntry = [number, number, number, number];
/** [stage, encounters] */
export type StageEntry = [number, EncounterEntry[]];
/** [difficulty, recommendedPower, stages] */
export type DifficultyEntry = [number, number, StageEntry[]];

export interface GameData {
  ages: string[];
  diffs: DifficultyEntry[];
  games: GameEntry[];
  gifts: Record<string, GiftRow[]>;
  goods: Record<string, Record<string, string>>;
}
