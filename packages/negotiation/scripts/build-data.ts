/**
 * Extracts the compact game data the solver needs from the raw game exports.
 *
 * Inputs (input/exports):
 *   NegotiationGameDefinitionDTO.json       negotiation games: item pool + turns per age
 *   NegotiationGameGiftsDefinitionDTO.json  what each pool item resolves to per age
 *   ResourceDefinitionDTO.json              maps (age, good_index) -> resource id for goods
 *   TreasureHuntDifficultiesDTO.json        difficulty -> stage -> encounter -> negotiation
 *
 * Output: src/generated/gamedata.json (see src/gamedata-types.ts).
 *
 * Usage: bun scripts/build-data.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { AGE_IDS, ageIndexOf, shortId } from "../src/ages.ts";
import type {
  DifficultyEntry,
  EncounterEntry,
  GameBand,
  GameData,
  GameEntry,
  GiftRow,
  PoolEntry,
  StageEntry,
} from "../src/gamedata-types.ts";

interface RawGift {
  amount: number | string;
  number?: number;
  offset?: number;
  resource_id?: string;
}
interface RawMapping {
  values: { then: { gift: RawGift }; when: string }[];
}
interface RawGiftDefinition {
  id: string;
  mapping: RawMapping;
}
interface RawGame {
  game_component: {
    values: {
      then: {
        possible_gifts: {
          factor: number;
          gift: { id: string; mapping?: RawMapping };
        }[];
        turns: number;
      };
      when: string;
    }[];
  };
  id: string;
}
interface RawResource {
  age?: string;
  cities?: string[];
  id: string;
  resource_type?: string;
  traits?: { "@type": string; good_index?: number }[];
}
interface RawDifficulty {
  difficulty?: number;
  recommended_power: number;
  stages: {
    encounters: {
      encounter_id?: number;
      negotiation_definition_id?: string;
      section?: number;
    }[];
    stage?: number;
  }[];
}

const PACKAGE_ROOT = path.join(import.meta.dirname, "..");
const EXPORTS_DIR = path.join(PACKAGE_ROOT, "input", "exports");
const OUT_FILE = path.join(PACKAGE_ROOT, "src", "generated", "gamedata.json");
const MAIN_CITY = "city.City_Capital";
const DIGITS = /\d+/gu;

const readExport = async <T>(name: string): Promise<T> => {
  const text = await readFile(path.join(EXPORTS_DIR, name), "utf-8");
  return JSON.parse(text) as T;
};

const giftRows = (mapping: RawMapping): GiftRow[] =>
  mapping.values.map(({ when, then }): GiftRow => {
    const { gift } = then;
    if (gift.resource_id !== undefined) {
      return [ageIndexOf(when), "r", shortId(gift.resource_id), gift.amount];
    }
    // Good gift: only the good's number and an age offset relative to the player's age.
    return [
      ageIndexOf(when),
      "g",
      gift.number ?? 0,
      gift.offset ?? 0,
      gift.amount,
    ];
  });

const numbersIn = (id: string): number[] =>
  (id.match(DIGITS) ?? []).map(Number);

const compareNumberLists = (left: number[], right: number[]): number => {
  const shared = Math.min(left.length, right.length);
  for (let index = 0; index < shared; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return left.length - right.length;
};

/** Treasure Hunt games first, then by the numbers in the id, then by id. */
const compareGames = ([left]: GameEntry, [right]: GameEntry): number => {
  const leftGroup = left.includes("ATH") ? 0 : 1;
  const rightGroup = right.includes("ATH") ? 0 : 1;
  if (leftGroup !== rightGroup) {
    return leftGroup - rightGroup;
  }
  const byNumbers = compareNumberLists(numbersIn(left), numbersIn(right));
  if (byNumbers !== 0) {
    return byNumbers;
  }
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
};

const buildGames = (
  rawGames: RawGame[],
  gifts: Record<string, GiftRow[]>
): GameEntry[] => {
  const games = rawGames.map((game): GameEntry => {
    const bands = game.game_component.values.map(({ when, then }): GameBand => {
      const pool = then.possible_gifts.map(({ gift, factor }): PoolEntry => {
        const giftId = shortId(gift.id);
        // A gift may carry its own definition when it is missing from the gifts export.
        if (gifts[giftId] === undefined && gift.mapping !== undefined) {
          gifts[giftId] = giftRows(gift.mapping);
        }
        if (gifts[giftId] === undefined) {
          throw new Error(
            `Gift ${giftId} of game ${game.id} has no definition`
          );
        }
        return [giftId, factor];
      });
      return [ageIndexOf(when), then.turns, pool];
    });
    return [shortId(game.id), bands];
  });
  return games.toSorted(compareGames);
};

const buildGoods = (resources: RawResource[]): GameData["goods"] => {
  const goods: GameData["goods"] = {};
  for (const resource of resources) {
    const isMainCityGood =
      resource.resource_type === "good" &&
      resource.age !== undefined &&
      (resource.cities ?? []).includes(MAIN_CITY);
    const ageIndex = isMainCityGood ? ageIndexOf(resource.age ?? "") : -1;
    const goodIndex = (resource.traits ?? []).find((trait) =>
      trait["@type"].endsWith("GoodTraitDTO")
    )?.good_index;
    if (ageIndex >= 0 && goodIndex !== undefined) {
      const forAge = goods[String(ageIndex)] ?? {};
      forAge[String(goodIndex)] = resource.id;
      goods[String(ageIndex)] = forAge;
    }
  }
  return goods;
};

const buildDifficulties = (
  rawDiffs: RawDifficulty[],
  games: GameEntry[]
): DifficultyEntry[] => {
  const indexOf = new Map(games.map(([gameId], index) => [gameId, index]));
  const missing = new Set<string>();
  const diffs = rawDiffs.map((diff): DifficultyEntry => {
    const stages = diff.stages.map((stage): StageEntry => {
      const encounters: EncounterEntry[] = [];
      for (const encounter of stage.encounters) {
        // Encounters without a negotiation are battles.
        if (encounter.negotiation_definition_id !== undefined) {
          const gameId = shortId(encounter.negotiation_definition_id);
          const gameIndex = indexOf.get(gameId);
          if (gameIndex === undefined) {
            missing.add(gameId);
          }
          encounters.push([
            encounter.encounter_id ?? 0,
            encounter.section ?? 0,
            gameIndex ?? -1,
            stage.encounters.length,
          ]);
        }
      }
      return [stage.stage ?? 0, encounters];
    });
    return [diff.difficulty ?? 0, diff.recommended_power, stages];
  });
  if (missing.size > 0) {
    throw new Error(
      `Difficulties reference negotiation games missing from the games export: ${[...missing].toSorted().join(", ")}`
    );
  }
  return diffs;
};

const [rawGames, rawGifts, rawResources, rawDiffs] = await Promise.all([
  readExport<RawGame[]>("NegotiationGameDefinitionDTO.json"),
  readExport<RawGiftDefinition[]>("NegotiationGameGiftsDefinitionDTO.json"),
  readExport<RawResource[]>("ResourceDefinitionDTO.json"),
  readExport<RawDifficulty[]>("TreasureHuntDifficultiesDTO.json"),
]);

const gifts: Record<string, GiftRow[]> = {};
for (const gift of rawGifts) {
  gifts[shortId(gift.id)] = giftRows(gift.mapping);
}
const games = buildGames(rawGames, gifts);
const data: GameData = {
  ages: [...AGE_IDS],
  diffs: buildDifficulties(rawDiffs, games),
  games,
  gifts,
  goods: buildGoods(rawResources),
};

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(data)}\n`);

const encounterCount = data.diffs
  .flatMap((difficulty) => difficulty[2])
  .reduce((total, [, encounters]) => total + encounters.length, 0);
process.stdout.write(
  `gamedata: ${games.length} games, ${Object.keys(gifts).length} gifts, ${data.diffs.length} difficulties, ${encounterCount} negotiation encounters -> ${path.relative(PACKAGE_ROOT, OUT_FILE)}\n`
);
