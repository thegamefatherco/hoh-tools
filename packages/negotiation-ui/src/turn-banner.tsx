import {
  describePattern,
  formatCount,
  formatPercent,
  letterOf,
} from "@hoh-tools/negotiation/format";
import { cn } from "@hoh-tools/ui/lib/utils";
import type { ReactNode } from "react";

import type { GameStatus, Session } from "./session";

/** Remaining combinations are listed only when there are this few. */
const LISTED_COMBINATIONS = 12;

type Tone = "error" | "failure" | "info" | "success";

const TONE_CLASS: Record<Tone, string> = {
  error: "border-destructive/60 bg-destructive/10",
  failure: "border-fb-red/60 bg-fb-red-soft",
  info: "border-border bg-muted",
  success: "border-fb-green/60 bg-fb-green-soft",
};

const Banner = ({ children, tone }: { children: ReactNode; tone: Tone }) => (
  <div
    className={cn("border px-3 py-2 text-xs/relaxed", TONE_CLASS[tone])}
    role={tone === "error" ? "alert" : "status"}
  >
    {children}
  </div>
);

const plural = (count: number, one: string, many: string): string =>
  count === 1 ? one : many;

/** At most one banner: the state of the game, or a note about the recommendation. */
export const TurnBanner = ({
  session,
  status,
}: {
  session: Session;
  status: GameStatus;
}) => {
  const { result, history } = session;
  if (result === null) {
    return null;
  }
  if (result.status === "error") {
    return (
      <Banner tone="error">
        The solver failed: {result.error}. Start a new game.
      </Banner>
    );
  }
  if (result.status === "inconsistent") {
    return (
      <Banner tone="error">
        <strong>No combination fits all the colours you entered.</strong> Check
        the last turn for a mis-click and use Undo. If the entries are right,
        the game&apos;s rules differ from the model used here (see &quot;How the
        recommendation is worked out&quot;).
      </Banner>
    );
  }
  if (status === "won") {
    return (
      <Banner tone="success">
        <strong>
          Solved in {history.length} {plural(history.length, "turn", "turns")}.
        </strong>{" "}
        Start a new game when the next negotiation opens.
      </Banner>
    );
  }
  if (status === "lost" || result.status === "over") {
    const combinations = result.sample
      .map((secret) => secret.map(letterOf).join(""))
      .join(", ");
    return (
      <Banner tone="failure">
        <strong>Out of turns.</strong> {formatCount(result.count)}{" "}
        {plural(result.count, "combination was", "combinations were")} still
        possible
        {result.count <= LISTED_COMBINATIONS ? `: ${combinations}` : ""}.
      </Banner>
    );
  }
  if (result.timedOut) {
    return (
      <Banner tone="info">
        The search hit its time limit, so this move is the best found rather
        than a proven optimum.
      </Banner>
    );
  }
  const [best, runnerUp] = result.alternatives ?? [];
  if (result.method === "table" && best !== undefined) {
    return (
      <Banner tone="info">
        Opening: <strong>{describePattern(best.pat)}</strong> gives{" "}
        {formatPercent(best.p)} with best play afterwards.
        {runnerUp === undefined
          ? ""
          : ` Next best: ${describePattern(runnerUp.pat)} at ${formatPercent(runnerUp.p)}.`}{" "}
        Which specific items you use does not matter, only how many repeat.
      </Banner>
    );
  }
  return null;
};
