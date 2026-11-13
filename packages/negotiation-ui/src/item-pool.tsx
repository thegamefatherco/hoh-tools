import type { PoolItem } from "@hoh-tools/negotiation/data";
import { cn } from "@hoh-tools/ui/lib/utils";

import { ItemIcon, LetterBadge, amountText } from "./item-art";

const ICON_SIZE = 22;

export const ItemPool = ({
  eliminated,
  pool,
}: {
  /** Items no open slot can still want; shown struck through. */
  eliminated: readonly number[];
  pool: readonly PoolItem[];
}) => (
  <section aria-labelledby="negotiation-pool" className="grid gap-2">
    <h2
      className="text-muted-foreground text-xs font-medium"
      id="negotiation-pool"
    >
      Item pool
    </h2>
    <ul className="flex flex-wrap gap-1.5">
      {pool.map((item, index) => {
        const isEliminated = eliminated.includes(index);
        return (
          <li
            className={cn(
              "border-border flex items-center gap-1.5 border py-1 pr-2.5 pl-1 text-xs",
              isEliminated && "line-through opacity-50"
            )}
            key={item.giftId}
          >
            <LetterBadge item={index} />
            <ItemIcon item={item} size={ICON_SIZE} />
            <span>{item.label}</span>
            <span className="text-muted-foreground font-mono tabular-nums">
              {amountText(item)}
            </span>
            {isEliminated ? (
              <span className="sr-only">(eliminated)</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  </section>
);
