import { AGE_LABELS, DIFFICULTIES } from "@hoh-tools/negotiation/data";
import type { Difficulty } from "@hoh-tools/negotiation/data";
import { formatCount } from "@hoh-tools/negotiation/format";
import { Button } from "@hoh-tools/ui/components/button";
import { Label } from "@hoh-tools/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hoh-tools/ui/components/select";
import type { Dispatch, ReactNode } from "react";

import { EncounterSelect, useDifficultyOdds } from "./encounter-list";
import type { Action, Game, Setup } from "./session";

const Field = ({
  children,
  id,
  label,
}: {
  children: ReactNode;
  id: string;
  label: string;
}) => (
  <div className="grid gap-1.5">
    <Label className="text-muted-foreground" htmlFor={id}>
      {label}
    </Label>
    {children}
  </div>
);

const difficultyName = (difficulty: Difficulty): string =>
  `Difficulty ${difficulty.difficulty + 1} · ${formatCount(difficulty.recommendedPower)} power`;

export const SetupBar = ({
  dispatch,
  game,
  setup,
}: {
  dispatch: Dispatch<Action>;
  game: Game;
  setup: Setup;
}) => {
  const odds = useDifficultyOdds(game.difficulty, setup.age);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field id="negotiation-difficulty" label="Difficulty">
          <Select
            onValueChange={(index) => {
              if (index !== null && index !== setup.difficultyIndex) {
                dispatch({ index, type: "difficulty" });
              }
            }}
            value={setup.difficultyIndex}
          >
            <SelectTrigger className="min-w-52" id="negotiation-difficulty">
              <SelectValue>
                {(index: number) => difficultyName(DIFFICULTIES[index])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((difficulty) => (
                <SelectItem key={difficulty.index} value={difficulty.index}>
                  {difficultyName(difficulty)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="negotiation-age" label="Your age">
          <Select
            onValueChange={(age) => {
              if (age !== null && age !== setup.age) {
                dispatch({ age, type: "age" });
              }
            }}
            value={setup.age}
          >
            <SelectTrigger className="min-w-40" id="negotiation-age">
              <SelectValue>{(age: number) => AGE_LABELS[age]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AGE_LABELS.map((label, age) => (
                <SelectItem key={label} value={age}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="negotiation-encounter" label="Negotiation">
          <EncounterSelect
            encounterKey={setup.encounterKey}
            id="negotiation-encounter"
            odds={odds}
            onSelect={(key) => {
              dispatch({ key, type: "encounter" });
            }}
          />
        </Field>

        <Button
          onClick={() => {
            dispatch({ type: "new-game" });
          }}
          variant="outline"
        >
          New game
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {odds.total} negotiations in this difficulty · about{" "}
        <strong className="text-foreground font-mono tabular-nums">
          {odds.expectedClears.toFixed(1)}
        </strong>{" "}
        cleared on average with best play, if wants are random.
      </p>
    </div>
  );
};
