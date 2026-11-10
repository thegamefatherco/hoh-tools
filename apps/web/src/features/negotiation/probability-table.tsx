import type { PoolItem } from "@hoh-tools/negotiation/data";
import { formatPercent, letterOf } from "@hoh-tools/negotiation/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hoh-tools/ui/components/table";
import type { CSSProperties } from "react";

import { ItemIcon } from "./item-art";

const HEADER_ICON_SIZE = 20;
const MIN_SHADE = 8;
const SHADE_RANGE = 62;
/** Above this probability the shade is dark enough to need inverted text. */
const INVERT_TEXT_FROM = 0.55;

const shade = (probability: number): CSSProperties => ({
  backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(MIN_SHADE + probability * SHADE_RANGE)}%, transparent)`,
  color:
    probability > INVERT_TEXT_FROM ? "var(--primary-foreground)" : undefined,
});

/** Rows are slots, columns are items; each cell is the chance that slot wants that item. */
export const ProbabilityTable = ({
  count,
  marg,
  pool,
}: {
  count: number;
  marg: readonly (readonly number[])[];
  pool: readonly PoolItem[];
}) => {
  const rows = marg.map((counts, slot) => ({
    cells: counts.map((candidates, item) => ({
      item,
      probability: candidates / count,
    })),
    slot,
  }));
  const columns = pool.map((item, index) => ({ index, item }));

  return (
    <Table className="text-center font-mono tabular-nums">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Slot</TableHead>
          {columns.map(({ index, item }) => (
            <TableHead
              className="px-1 text-center"
              key={index}
              scope="col"
              title={item.label}
            >
              <span className="inline-flex items-center gap-1">
                <ItemIcon item={item} size={HEADER_ICON_SIZE} />
                {letterOf(index)}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.slot}>
            <TableHead className="text-left" scope="row">
              {row.slot + 1}
            </TableHead>
            {row.cells.map((cell) =>
              cell.probability > 0 ? (
                <TableCell
                  className="px-1"
                  key={cell.item}
                  style={shade(cell.probability)}
                >
                  {formatPercent(cell.probability)}
                </TableCell>
              ) : (
                <TableCell
                  className="text-muted-foreground px-1"
                  key={cell.item}
                >
                  <span aria-hidden="true">·</span>
                  <span className="sr-only">0%</span>
                </TableCell>
              )
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
