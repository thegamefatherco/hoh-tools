import type { PoolItem } from "@hoh-tools/negotiation/data";
import { OPEN_SLOT } from "@hoh-tools/negotiation/engine";
import type { Color } from "@hoh-tools/negotiation/engine";
import {
  formatCount,
  formatPercent,
  letterOf,
} from "@hoh-tools/negotiation/format";
import { Button } from "@hoh-tools/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hoh-tools/ui/components/card";
import { cn } from "@hoh-tools/ui/lib/utils";
import { Loader2 } from "lucide-react";
import type { Dispatch } from "react";

import { ItemIcon } from "./item-art";
import type { Action, Game, GameStatus, Session, Turn } from "./session";
import { SlotCard } from "./slot-card";
import { TurnBanner } from "./turn-banner";

const HISTORY_ICON_SIZE = 20;
const UNKNOWN = "–";

const COLOR_CLASS: Record<Color, string> = {
  G: "border-fb-green bg-fb-green-soft",
  O: "border-fb-orange bg-fb-orange-soft",
  R: "border-fb-red bg-fb-red-soft",
};
const COLOR_NAME: Record<Color, string> = {
  G: "green",
  O: "orange",
  R: "red",
};

interface Stats {
  count: string;
  pNow: string;
  pWin: string;
}

const statsOf = (session: Session, status: GameStatus): Stats => {
  const { result } = session;
  if (result === null) {
    return { count: UNKNOWN, pNow: UNKNOWN, pWin: UNKNOWN };
  }
  if (result.status === "error" || result.status === "inconsistent") {
    return { count: "0", pNow: UNKNOWN, pWin: "0%" };
  }
  const count = formatCount(result.count);
  if (status === "won") {
    return { count, pNow: UNKNOWN, pWin: "100%" };
  }
  if (status === "lost" || result.status === "over") {
    return { count, pNow: UNKNOWN, pWin: "0%" };
  }
  return {
    count,
    pNow: formatPercent(result.pNow),
    pWin: formatPercent(result.pWin),
  };
};

const titleSuffix = (
  session: Session,
  game: Game,
  status: GameStatus
): string => {
  if (status === "won") {
    return "Solved";
  }
  if (status === "lost") {
    return "Out of turns";
  }
  return `Turn ${session.history.length + 1} of ${game.turns}`;
};

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="border-border bg-muted/40 grid gap-1 border p-2.5">
    <dd className="font-mono text-xl font-semibold tabular-nums">{value}</dd>
    <dt className="text-muted-foreground text-xs">{label}</dt>
  </div>
);

const HistoryRow = ({
  pool,
  turn,
  turnNumber,
}: {
  pool: readonly PoolItem[];
  turn: Turn;
  turnNumber: number;
}) => {
  const cells = turn.guess.map((item, slot) => ({
    color: turn.colors[slot],
    item,
    slot,
  }));
  return (
    <li className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground w-14 shrink-0 font-mono text-xs">
        Turn {turnNumber}
      </span>
      {cells.map((cell) => (
        <span
          className={cn(
            "flex min-w-12 items-center justify-center gap-1 border px-1.5 py-1 font-mono text-xs font-semibold",
            COLOR_CLASS[cell.color]
          )}
          key={cell.slot}
          title={`Slot ${cell.slot + 1}: ${letterOf(cell.item)} · ${pool[cell.item].label}`}
        >
          <ItemIcon item={pool[cell.item]} size={HISTORY_ICON_SIZE} />
          {letterOf(cell.item)}
          <span className="sr-only">{COLOR_NAME[cell.color]}</span>
        </span>
      ))}
    </li>
  );
};

export const TurnPanel = ({
  dispatch,
  game,
  session,
  status,
}: {
  dispatch: Dispatch<Action>;
  game: Game;
  session: Session;
  status: GameStatus;
}) => {
  const { busy, colors, history, placement, result } = session;
  const stats = statsOf(session, status);
  const recommended = result?.status === "ok" ? result.guess : [];
  const locked = result !== null && "locked" in result ? result.locked : [];
  const slots = (placement ?? []).map((item, slot) => ({ item, slot }));
  const turns = history.map((turn, index) => ({ number: index + 1, turn }));
  const isFinished = status !== "playing" || placement === null;
  const isReady = !isFinished && colors.every((color) => color !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <h2>
            Stage {game.encounter.stage + 1} · Encounter{" "}
            {game.encounter.encounterId + 1} ·{" "}
            {titleSuffix(session, game, status)}
          </h2>
          <output
            aria-live="polite"
            className="text-muted-foreground flex items-center gap-1.5 text-xs font-normal"
          >
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                Calculating…
              </>
            ) : null}
          </output>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-3 gap-2">
          <StatTile
            label="Chance to clear all slots from here"
            value={stats.pWin}
          />
          <StatTile
            label="Chance this turn is the full solve"
            value={stats.pNow}
          />
          <StatTile label="Combinations still possible" value={stats.count} />
        </dl>

        <TurnBanner session={session} status={status} />

        {slots.length > 0 && status === "playing" ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] gap-2">
            {slots.map(({ item, slot }) => (
              <SlotCard
                color={colors[slot] ?? null}
                dispatch={dispatch}
                isChanged={recommended[slot] !== item}
                isLocked={(locked[slot] ?? OPEN_SLOT) !== OPEN_SLOT}
                itemIndex={item}
                key={slot}
                pool={game.pool}
                slot={slot}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={busy || !isReady}
            onClick={() => {
              dispatch({ type: "submit" });
            }}
          >
            Submit result
          </Button>
          <Button
            disabled={busy || isFinished}
            onClick={() => {
              dispatch({ type: "all-green" });
            }}
            variant="outline"
          >
            All green
          </Button>
          <Button
            disabled={history.length === 0}
            onClick={() => {
              dispatch({ type: "undo" });
            }}
            variant="outline"
          >
            Undo last turn
          </Button>
          {isFinished || isReady ? null : (
            <span className="text-muted-foreground text-xs">
              Mark a colour on every slot to submit.
            </span>
          )}
        </div>

        <section aria-labelledby="negotiation-history" className="grid gap-2">
          <h3
            className="text-muted-foreground text-xs font-medium"
            id="negotiation-history"
          >
            History
          </h3>
          {turns.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No turns played yet.
            </p>
          ) : (
            <ol className="grid gap-1.5">
              {turns.map(({ number, turn }) => (
                <HistoryRow
                  key={number}
                  pool={game.pool}
                  turn={turn}
                  turnNumber={number}
                />
              ))}
            </ol>
          )}
        </section>
      </CardContent>
    </Card>
  );
};
