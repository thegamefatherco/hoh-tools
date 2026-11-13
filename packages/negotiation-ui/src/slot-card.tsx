import type { PoolItem } from "@hoh-tools/negotiation/data";
import type { Color } from "@hoh-tools/negotiation/engine";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hoh-tools/ui/components/select";
import { cn } from "@hoh-tools/ui/lib/utils";
import { Lock } from "lucide-react";
import type { Dispatch } from "react";

import greenIcon from "./assets/feedback/green.webp";
import orangeIcon from "./assets/feedback/orange.webp";
import redIcon from "./assets/feedback/red.webp";
import { ItemIcon, LetterBadge, amountText, breakable } from "./item-art";
import type { Action } from "./session";

const ART_SIZE = 44;
const FEEDBACK_ICON_SIZE = 24;
const OPTION_ICON_SIZE = 24;

const FEEDBACK: readonly {
  color: Color;
  icon: string;
  label: string;
  selected: string;
}[] = [
  {
    color: "G",
    icon: greenIcon,
    label: "Green",
    selected: "border-fb-green bg-fb-green-soft",
  },
  {
    color: "O",
    icon: orangeIcon,
    label: "Orange",
    selected: "border-fb-orange bg-fb-orange-soft",
  },
  {
    color: "R",
    icon: redIcon,
    label: "Red",
    selected: "border-fb-red bg-fb-red-soft",
  },
];

const SlotStatus = ({
  isChanged,
  isLocked,
}: {
  isChanged: boolean;
  isLocked: boolean;
}) => {
  if (isLocked) {
    return (
      <span className="flex items-center gap-1">
        <Lock aria-hidden="true" className="size-3" />
        Locked
      </span>
    );
  }
  return isChanged ? <span>Changed</span> : null;
};

/** The picked item as a tile: art with its letter, name, and final amount. */
const ItemTile = ({
  item,
  itemIndex,
}: {
  item: PoolItem;
  itemIndex: number;
}) => (
  <span className="flex w-full flex-col items-center gap-1 text-center">
    <span className="bg-muted relative grid size-12 shrink-0 place-items-center">
      <ItemIcon item={item} size={ART_SIZE} />
      <LetterBadge
        className="ring-card absolute -top-1.5 -left-1.5 ring-2"
        item={itemIndex}
      />
    </span>
    <span className="text-foreground text-xs font-medium wrap-break-word">
      {breakable(item.label)}
    </span>
    <span className="text-muted-foreground font-mono text-xs tabular-nums">
      {amountText(item)}
    </span>
  </span>
);

const ItemOption = ({
  item,
  itemIndex,
}: {
  item: PoolItem;
  itemIndex: number;
}) => (
  <span className="flex w-full items-center gap-2">
    <LetterBadge item={itemIndex} />
    <ItemIcon item={item} size={OPTION_ICON_SIZE} />
    <span>{item.label}</span>
    <span className="text-muted-foreground ml-auto pl-3 font-mono tabular-nums">
      {amountText(item)}
    </span>
  </span>
);

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
  const slotNumber = slot + 1;

  return (
    <div
      className={cn(
        "border-border bg-card grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-2.5 border p-3 transition-opacity motion-reduce:transition-none @3xl:grid-cols-1 @3xl:content-start @3xl:items-stretch",
        isLocked && "opacity-50"
      )}
    >
      <div className="text-muted-foreground col-span-full flex items-center justify-between text-xs font-medium">
        <span>Slot {slotNumber}</span>
        <SlotStatus isChanged={isChanged} isLocked={isLocked} />
      </div>

      <Select
        disabled={isLocked}
        onValueChange={(item) => {
          if (item !== null) {
            dispatch({ item, slot, type: "pick" });
          }
        }}
        value={itemIndex}
      >
        <SelectTrigger
          aria-label={`Item placed in slot ${slotNumber}`}
          className="relative w-full justify-center px-2 py-2.5 whitespace-normal data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none [&>svg]:absolute [&>svg]:top-1.5 [&>svg]:right-1.5"
        >
          <SelectValue className="w-full">
            {(value: number) => (
              <ItemTile item={pool[value]} itemIndex={value} />
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className="w-max min-w-(--anchor-width)"
        >
          {pool.map((option, index) => (
            <SelectItem key={option.giftId} value={index}>
              <ItemOption item={option} itemIndex={index} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
