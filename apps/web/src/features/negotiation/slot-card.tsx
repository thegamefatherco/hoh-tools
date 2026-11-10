import type { PoolItem } from "@hoh-tools/negotiation/data";
import type { Color } from "@hoh-tools/negotiation/engine";
import { letterOf } from "@hoh-tools/negotiation/format";
import {
  NativeSelect,
  NativeSelectOption,
} from "@hoh-tools/ui/components/native-select";
import { cn } from "@hoh-tools/ui/lib/utils";
import type { Dispatch } from "react";

import { ItemIcon, LetterBadge, amountText, breakable } from "./item-art";
import type { Action } from "./session";

const ART_SIZE = 44;
const FEEDBACK_ICON_SIZE = 24;

const FEEDBACK: readonly {
  color: Color;
  icon: string;
  label: string;
  selected: string;
}[] = [
  {
    color: "G",
    icon: "/negotiation/feedback/green.webp",
    label: "Green",
    selected: "border-fb-green bg-fb-green-soft",
  },
  {
    color: "O",
    icon: "/negotiation/feedback/orange.webp",
    label: "Orange",
    selected: "border-fb-orange bg-fb-orange-soft",
  },
  {
    color: "R",
    icon: "/negotiation/feedback/red.webp",
    label: "Red",
    selected: "border-fb-red bg-fb-red-soft",
  },
];

const statusLabel = (isLocked: boolean, isChanged: boolean): string => {
  if (isLocked) {
    return "Locked";
  }
  return isChanged ? "Changed" : "";
};

export const SlotCard = ({
  color,
  dispatch,
  isChanged,
  isLocked,
  itemIndex,
  pool,
  slot,
}: {
  color: Color | null;
  dispatch: Dispatch<Action>;
  /** The player picked an item other than the recommendation. */
  isChanged: boolean;
  isLocked: boolean;
  itemIndex: number;
  pool: readonly PoolItem[];
  slot: number;
}) => {
  const item = pool[itemIndex];
  const slotNumber = slot + 1;

  return (
    <div
      className={cn(
        "border-border bg-card grid content-start gap-2.5 border p-3",
        isLocked && "border-fb-green/60"
      )}
    >
      <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
        <span>Slot {slotNumber}</span>
        <span>{statusLabel(isLocked, isChanged)}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="bg-muted relative grid size-12 shrink-0 place-items-center">
          <ItemIcon item={item} size={ART_SIZE} />
          <LetterBadge
            className="ring-card absolute -top-1.5 -left-1.5 ring-2"
            item={itemIndex}
          />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium wrap-break-word">
            {breakable(item.label)}
          </div>
          <div className="text-muted-foreground font-mono text-xs tabular-nums">
            {amountText(item)}
          </div>
        </div>
      </div>

      <NativeSelect
        aria-label={`Item placed in slot ${slotNumber}`}
        className="w-full"
        disabled={isLocked}
        onChange={(event) => {
          dispatch({
            item: Number(event.target.value),
            slot,
            type: "pick",
          });
        }}
        value={itemIndex}
      >
        {pool.map((option, index) => (
          <NativeSelectOption key={option.giftId} value={index}>
            {letterOf(index)} · {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <fieldset className="grid grid-cols-3 gap-1.5">
        <legend className="sr-only">Feedback for slot {slotNumber}</legend>
        {FEEDBACK.map((feedback) => {
          const isSelected = color === feedback.color;
          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                "border-border bg-background hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 grid min-h-14 place-items-center gap-1 border px-1 py-1.5 text-xs transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
                isSelected && `font-medium ${feedback.selected}`
              )}
              disabled={isLocked && feedback.color !== "G"}
              key={feedback.color}
              onClick={() => {
                dispatch({ color: feedback.color, slot, type: "color" });
              }}
              type="button"
            >
              <img
                alt=""
                className={cn(!isSelected && "opacity-60 grayscale")}
                height={FEEDBACK_ICON_SIZE}
                src={feedback.icon}
                width={FEEDBACK_ICON_SIZE}
              />
              {feedback.label}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
};
