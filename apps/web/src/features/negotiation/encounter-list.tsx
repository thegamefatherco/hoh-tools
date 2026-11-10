import { resolveGame } from "@hoh-tools/negotiation/data";
import type { Difficulty, Encounter } from "@hoh-tools/negotiation/data";
import { formatPercent } from "@hoh-tools/negotiation/format";
import { clearChance } from "@hoh-tools/negotiation/openings";
import { cn } from "@hoh-tools/ui/lib/utils";
import { useMemo } from "react";
import type { Dispatch } from "react";

import type { Action, Setup } from "./session";

const EASY_FROM = 0.8;
const MEDIUM_FROM = 0.4;

interface EncounterOdds {
  /** Chance to clear with best play, or null when unknown. */
  chance: number | null;
  encounter: Encounter;
  items: number;
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

const EncounterChip = ({
  isSelected,
  odds,
  onSelect,
}: {
  isSelected: boolean;
  odds: EncounterOdds;
  onSelect: (key: string) => void;
}) => (
  <button
    aria-pressed={isSelected}
    className={cn(
      "border-border bg-background hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 grid gap-0.5 border px-2.5 py-1.5 text-left text-xs transition-colors outline-none focus-visible:ring-2 motion-reduce:transition-none",
      isSelected && "border-primary bg-muted ring-primary ring-1"
    )}
    onClick={() => {
      onSelect(odds.encounter.key);
    }}
    type="button"
  >
    <span className="font-medium">
      Encounter {odds.encounter.encounterId + 1}
    </span>
    <span className="text-muted-foreground">
      {odds.items} items ·{" "}
      <span className={cn("font-mono tabular-nums", chanceClass(odds.chance))}>
        {odds.chance === null ? "?" : formatPercent(odds.chance)}
      </span>
    </span>
  </button>
);

export const EncounterList = ({
  difficulty,
  dispatch,
  setup,
}: {
  difficulty: Difficulty;
  dispatch: Dispatch<Action>;
  setup: Setup;
}) => {
  const { age, slots } = setup;
  const stages = useMemo(
    () =>
      difficulty.stages.map((stage) => ({
        encounters: stage.encounters.map((encounter): EncounterOdds => {
          const game = resolveGame(encounter.gameId, age);
          return {
            chance: clearChance(slots, game.pool.length, game.turns),
            encounter,
            items: game.pool.length,
          };
        }),
        stage: stage.stage,
      })),
    [age, difficulty, slots]
  );
  const all = stages.flatMap((stage) => stage.encounters);
  let expectedClears = 0;
  for (const odds of all) {
    expectedClears += odds.chance ?? 0;
  }
  const select = (key: string): void => {
    dispatch({ key, type: "encounter" });
  };

  return (
    <section aria-labelledby="negotiation-encounters" className="grid gap-2">
      <h2
        className="text-muted-foreground text-xs font-medium"
        id="negotiation-encounters"
      >
        Negotiations in this difficulty
      </h2>
      {stages.map((stage) => (
        <div className="flex flex-wrap items-center gap-1.5" key={stage.stage}>
          <span className="text-muted-foreground w-16 shrink-0 text-xs font-medium">
            Stage {stage.stage + 1}
          </span>
          {stage.encounters.map((odds) => (
            <EncounterChip
              isSelected={odds.encounter.key === setup.encounterKey}
              key={odds.encounter.key}
              odds={odds}
              onSelect={select}
            />
          ))}
        </div>
      ))}
      <p className="text-muted-foreground text-xs">
        {all.length} negotiations · about{" "}
        <strong className="text-foreground font-mono tabular-nums">
          {expectedClears.toFixed(1)}
        </strong>{" "}
        cleared on average with best play, if wants are random.
      </p>
    </section>
  );
};
