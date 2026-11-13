import type { PoolItem } from "@hoh-tools/negotiation/data";
import type { Deduction } from "@hoh-tools/negotiation/deductions";
import {
  formatCount,
  formatPercent,
  letterOf,
} from "@hoh-tools/negotiation/format";
import type { ReactNode } from "react";

const letters = (items: readonly number[]): string =>
  items.map(letterOf).join(", ");

const lineKey = (line: Deduction): string => {
  switch (line.kind) {
    case "slot-solved":
    case "slot-forced":
    case "slot-options": {
      return `slot-${line.slot}`;
    }
    case "wanted": {
      return `wanted-${line.item}`;
    }
    default: {
      return line.kind;
    }
  }
};

const lineText = (line: Deduction, pool: readonly PoolItem[]): ReactNode => {
  switch (line.kind) {
    case "count": {
      return (
        <>
          <strong>{formatCount(line.count)}</strong>{" "}
          {line.count === 1 ? "combination" : "combinations"} of wants still fit
          every colour so far.
        </>
      );
    }
    case "nothing-known": {
      return `Nothing is known yet. Every slot is equally likely to want any of the ${line.items} items.`;
    }
    case "slot-solved": {
      return (
        <>
          Slot {line.slot + 1} is solved: <strong>{letterOf(line.item)}</strong>{" "}
          ({pool[line.item].label}).
        </>
      );
    }
    case "slot-forced": {
      return (
        <>
          Slot {line.slot + 1} must be <strong>{letterOf(line.item)}</strong> (
          {pool[line.item].label}).
        </>
      );
    }
    case "slot-options": {
      const options = line.options
        .map(
          (option) =>
            `${letterOf(option.item)} ${formatPercent(option.probability)}`
        )
        .join(", ");
      const ruledOut =
        line.ruledOut.length > 0 ? `; ruled out ${letters(line.ruledOut)}` : "";
      return `Slot ${line.slot + 1}: ${options}${ruledOut}.`;
    }
    case "eliminated": {
      return (
        <>
          Eliminated for every open slot: <strong>{letters(line.items)}</strong>
          .
        </>
      );
    }
    case "wanted": {
      return (
        <>
          <strong>{letterOf(line.item)}</strong> is wanted by at least one of
          slots {line.slots.map((slot) => slot + 1).join(", ")}.
        </>
      );
    }
    default: {
      return `Not tried yet: ${letters(line.items)}. These are interchangeable until tested.`;
    }
  }
};

export const DeductionList = ({
  lines,
  pool,
}: {
  lines: readonly Deduction[];
  pool: readonly PoolItem[];
}) => (
  <ul className="marker:text-muted-foreground grid list-disc gap-1 pl-4 text-xs/relaxed">
    {lines.map((line) => (
      <li key={lineKey(line)}>{lineText(line, pool)}</li>
    ))}
  </ul>
);
