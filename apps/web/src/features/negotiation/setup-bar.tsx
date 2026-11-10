import { AGE_LABELS, DIFFICULTIES } from "@hoh-tools/negotiation/data";
import { formatCount } from "@hoh-tools/negotiation/format";
import { Button } from "@hoh-tools/ui/components/button";
import { Label } from "@hoh-tools/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@hoh-tools/ui/components/native-select";
import type { ChangeEvent, Dispatch, ReactNode } from "react";

import { SLOT_OPTIONS, TURN_OPTIONS } from "./session";
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

const numberOf = (event: ChangeEvent<HTMLSelectElement>): number =>
  Number(event.target.value);

export const SetupBar = ({
  dispatch,
  game,
  setup,
}: {
  dispatch: Dispatch<Action>;
  game: Game;
  setup: Setup;
}) => (
  <div className="flex flex-wrap items-end gap-3">
    <Field id="negotiation-difficulty" label="Difficulty">
      <NativeSelect
        id="negotiation-difficulty"
        onChange={(event) => {
          dispatch({ index: numberOf(event), type: "difficulty" });
        }}
        value={setup.difficultyIndex}
      >
        {DIFFICULTIES.map((difficulty) => (
          <NativeSelectOption key={difficulty.index} value={difficulty.index}>
            Difficulty {difficulty.difficulty + 1} ·{" "}
            {formatCount(difficulty.recommendedPower)} power
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>

    <Field id="negotiation-age" label="Your age">
      <NativeSelect
        id="negotiation-age"
        onChange={(event) => {
          dispatch({ age: numberOf(event), type: "age" });
        }}
        value={setup.age}
      >
        {AGE_LABELS.map((label, age) => (
          <NativeSelectOption key={label} value={age}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>

    <Field id="negotiation-slots" label="Characters">
      <NativeSelect
        id="negotiation-slots"
        onChange={(event) => {
          dispatch({ slots: numberOf(event), type: "slots" });
        }}
        value={setup.slots}
      >
        {SLOT_OPTIONS.map((slots) => (
          <NativeSelectOption key={slots} value={slots}>
            {slots}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>

    <Field id="negotiation-turns" label="Turns">
      <NativeSelect
        id="negotiation-turns"
        onChange={(event) => {
          dispatch({ turns: numberOf(event), type: "turns" });
        }}
        value={game.turns}
      >
        {TURN_OPTIONS.map((turns) => (
          <NativeSelectOption key={turns} value={turns}>
            {turns}
          </NativeSelectOption>
        ))}
      </NativeSelect>
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
);
