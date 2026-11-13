import { resolveGame } from "@hoh-tools/negotiation/data";
import type { Difficulty, Encounter } from "@hoh-tools/negotiation/data";
import { formatPercent } from "@hoh-tools/negotiation/format";
import { clearChance } from "@hoh-tools/negotiation/openings";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@hoh-tools/ui/components/select";
import { cn } from "@hoh-tools/ui/lib/utils";
import { useMemo } from "react";

import { CHARACTERS } from "./session";

const EASY_FROM = 0.8;
const MEDIUM_FROM = 0.4;

export interface EncounterOdds {
  /** Chance to clear with best play, or null when unknown. */
  chance: number | null;
  encounter: Encounter;
  items: number;
}

export interface StageOdds {
  encounters: EncounterOdds[];
  stage: number;
}

export interface DifficultyOdds {
  /** Negotiations cleared on average with best play, if wants are random. */
  expectedClears: number;
  stages: StageOdds[];
  total: number;
}

/** Green from 80%, orange from 40%, red below that. */
export const chanceClass = (chance: number | null): string => {
  if (chance === null) {
    return "text-muted-foreground";
  }
  if (chance >= EASY_FROM) {
    return "text-fb-green";
  }
  return chance >= MEDIUM_FROM ? "text-fb-orange" : "text-fb-red";
};

/** Clear chances of every negotiation in a difficulty, for the player's age. */
export const useDifficultyOdds = (
  difficulty: Difficulty,
  age: number
): DifficultyOdds =>
  useMemo(() => {
    const stages = difficulty.stages.map((stage): StageOdds => ({
      encounters: stage.encounters.map((encounter): EncounterOdds => {
        const game = resolveGame(encounter.gameId, age);
        return {
          chance: clearChance(CHARACTERS, game.pool.length, game.turns),
          encounter,
          items: game.pool.length,
        };
      }),
      stage: stage.stage,
    }));
    const all = stages.flatMap((stage) => stage.encounters);
    let expectedClears = 0;
    for (const odds of all) {
      expectedClears += odds.chance ?? 0;
    }
    return { expectedClears, stages, total: all.length };
  }, [age, difficulty]);

const OddsText = ({ odds }: { odds: EncounterOdds }) => (
  <span className="text-muted-foreground">
    {odds.items} items ·{" "}
    <span className={cn("font-mono tabular-nums", chanceClass(odds.chance))}>
      {odds.chance === null ? "?" : formatPercent(odds.chance)}
    </span>
  </span>
);

const encounterName = (encounter: Encounter): string =>
  `Stage ${encounter.stage + 1} · Encounter ${encounter.encounterId + 1}`;

/** One selector for every negotiation of the difficulty, grouped by stage. */
export const EncounterSelect = ({
  encounterKey,
  id,
  odds,
  onSelect,
}: {
  encounterKey: string;
  id: string;
  odds: DifficultyOdds;
  onSelect: (key: string) => void;
}) => {
  const byKey = new Map(
    odds.stages.flatMap((stage) =>
      stage.encounters.map((entry) => [entry.encounter.key, entry] as const)
    )
  );

  return (
    <Select
      onValueChange={(key) => {
        if (key !== null && key !== encounterKey) {
          onSelect(key);
        }
      }}
      value={encounterKey}
    >
      <SelectTrigger className="min-w-64" id={id}>
        <SelectValue>
          {(key: string) => {
            const selected = byKey.get(key);
            if (selected === undefined) {
              return "Pick a negotiation";
            }
            return (
              <>
                <span className="font-medium">
                  {encounterName(selected.encounter)}
                </span>
                <OddsText odds={selected} />
              </>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {odds.stages.map((stage) => (
          <SelectGroup key={stage.stage}>
            <SelectLabel>Stage {stage.stage + 1}</SelectLabel>
            {stage.encounters.map((entry) => (
              <SelectItem key={entry.encounter.key} value={entry.encounter.key}>
                <span>Encounter {entry.encounter.encounterId + 1}</span>
                <OddsText odds={entry} />
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
