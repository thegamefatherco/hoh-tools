import type { PoolItem } from "@hoh-tools/negotiation/data";
import type { Deductions } from "@hoh-tools/negotiation/deductions";
import { OPEN_SLOT } from "@hoh-tools/negotiation/engine";
import { letterOf } from "@hoh-tools/negotiation/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hoh-tools/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hoh-tools/ui/components/collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { DeductionList } from "./deduction-list";
import { ItemIcon } from "./item-art";
import { ProbabilityTable } from "./probability-table";
import type { SolverOutcome } from "./session";

const MOVE_ICON_SIZE = 20;

const LEGEND = [
  { className: "bg-fb-green", name: "Green", text: "right item, right slot" },
  {
    className: "bg-fb-orange",
    name: "Orange",
    text: "another open slot wants it",
  },
  { className: "bg-fb-red", name: "Red", text: "no open slot wants it" },
];

const Section = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <section className="grid gap-2">
    <h3 className="text-muted-foreground text-xs font-medium">{title}</h3>
    {children}
  </section>
);

const Moves = ({
  guess,
  locked,
  pool,
}: {
  guess: readonly number[];
  locked: readonly number[];
  pool: readonly PoolItem[];
}) => {
  const moves = guess.map((item, slot) => ({ item, slot }));
  return (
    <ol className="grid gap-1 font-mono text-xs">
      {moves.map(({ item, slot }) => (
        <li className="flex flex-wrap items-center gap-1.5" key={slot}>
          Slot {slot + 1}:
          <ItemIcon item={pool[item]} size={MOVE_ICON_SIZE} />
          {letterOf(item)} · {pool[item].label}
          {locked[slot] === OPEN_SLOT ? "" : " (keep)"}
        </li>
      ))}
    </ol>
  );
};

const HowItWorks = () => (
  <Collapsible>
    <CollapsibleTrigger className="group border-border hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 border px-2.5 py-2 text-left text-xs font-medium outline-none focus-visible:ring-2">
      How the recommendation is worked out
      <ChevronDown className="size-4 transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none" />
    </CollapsibleTrigger>
    <CollapsibleContent className="border-border text-muted-foreground grid gap-2 border border-t-0 p-2.5 text-xs/relaxed">
      <p>
        The solver keeps every combination of wants that still fits all the
        colours you entered. Each of them is equally likely, so the chance to
        clear is a count: for how many of them does best play finish in the
        turns left?
      </p>
      <p>
        With two turns left it tries every placement and picks the one that
        splits the remaining combinations into the most distinct colour
        patterns, because each pattern can be finished with certainty only if it
        leaves a single combination. That is why the best move often repeats an
        item or puts one where it is already known to be wrong: it is buying
        information, not guessing. On the last turn it places the most likely
        remaining combination. First moves come from a table computed in advance
        with the same search.
      </p>
      <p>These are assumptions; the game data does not confirm them:</p>
      <ul className="grid list-disc gap-1 pl-4">
        <li>
          Each character independently wants any item of the pool with equal
          chance, and several may want the same item. If this is wrong the
          percentages are off, but the deductions stay valid.
        </li>
        <li>
          Orange means some other slot that is not green this turn wants the
          item, without counting copies. If the game counts copies, repeated
          items can lead to &quot;no combination fits&quot;; use Undo.
        </li>
        <li>
          There are always 5 characters and 3 turns. Amounts already include the
          negotiation&apos;s factor.
        </li>
        <li>
          Goods named &quot;current&quot; or &quot;previous&quot; are counted
          from your own age.
        </li>
      </ul>
    </CollapsibleContent>
  </Collapsible>
);

export const AnalysisPanel = ({
  deductions,
  isPlaying,
  pool,
  result,
}: {
  deductions: Deductions | null;
  isPlaying: boolean;
  pool: readonly PoolItem[];
  result: SolverOutcome | null;
}) => {
  const analysis = result !== null && "marg" in result ? result : null;
  const isCurrent = analysis?.marg[0]?.length === pool.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Analysis</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {analysis !== null && deductions !== null && isCurrent ? (
          <>
            <Section title="Deductions">
              <DeductionList lines={deductions.lines} pool={pool} />
            </Section>
            <Section title="Optimal moves, as text">
              {analysis.status === "ok" && isPlaying ? (
                <Moves
                  guess={analysis.guess}
                  locked={analysis.locked}
                  pool={pool}
                />
              ) : (
                <p className="text-muted-foreground text-xs">
                  No moves left this game.
                </p>
              )}
            </Section>
            <Section title="Where each item can still be">
              <ProbabilityTable
                count={analysis.count}
                marg={analysis.marg}
                pool={pool}
              />
            </Section>
          </>
        ) : (
          <p className="text-muted-foreground text-xs">
            {result === null ? "Calculating…" : "Nothing to analyse."}
          </p>
        )}

        <HowItWorks />

        <ul className="text-muted-foreground grid gap-1 text-xs">
          {LEGEND.map((entry) => (
            <li className="flex items-center gap-2" key={entry.name}>
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${entry.className}`}
              />
              <span>
                <strong className="text-foreground">{entry.name}</strong> ={" "}
                {entry.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
