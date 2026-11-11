import { deduce } from "@hoh-tools/negotiation/deductions";
import { Card, CardContent } from "@hoh-tools/ui/components/card";
import { useMemo } from "react";

import { AnalysisPanel } from "./analysis-panel";
import { EncounterList } from "./encounter-list";
import { ItemPool } from "./item-pool";
import { SetupBar } from "./setup-bar";
import type { SolverWorker } from "./solver-client";
import { TurnPanel } from "./turn-panel";
import { useNegotiation } from "./use-negotiation";

const NO_ITEMS: readonly number[] = [];

/**
 * The solver page. Client-only: it reads local storage and runs a web worker.
 * `createWorker` must be a stable (module-level) function; it starts the solver worker.
 */
export const NegotiationSolver = ({
  createWorker,
}: {
  createWorker: () => SolverWorker;
}) => {
  const { dispatch, game, session, status } = useNegotiation(createWorker);
  const { history, result, setup } = session;
  const turnsPlayed = history.length;

  const deductions = useMemo(
    () =>
      result !== null && "marg" in result ? deduce(result, turnsPlayed) : null,
    [result, turnsPlayed]
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4">
      <header className="grid gap-1">
        <h1 className="text-lg font-semibold">Negotiation solver</h1>
        <p className="text-muted-foreground text-xs">
          Treasure Hunt negotiations: place what it recommends, mark the colours
          the game shows, repeat.
        </p>
      </header>

      <Card>
        <CardContent className="grid gap-4">
          <SetupBar dispatch={dispatch} game={game} setup={setup} />
          <EncounterList
            difficulty={game.difficulty}
            dispatch={dispatch}
            setup={setup}
          />
          <ItemPool
            eliminated={deductions?.eliminated ?? NO_ITEMS}
            pool={game.pool}
          />
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TurnPanel
          dispatch={dispatch}
          game={game}
          session={session}
          status={status}
        />
        <AnalysisPanel
          deductions={deductions}
          isPlaying={status === "playing"}
          pool={game.pool}
          result={result}
        />
      </div>
    </div>
  );
};
