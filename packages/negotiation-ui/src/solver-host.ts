import { OPENINGS } from "@hoh-tools/negotiation/openings";
import { solve } from "@hoh-tools/negotiation/solver";

import type { SolveRequest, SolverOutcome } from "./session";
import type { SolverResponse } from "./solver-client";

const run = (request: SolveRequest): SolverOutcome => {
  try {
    return solve({ ...request.input, openings: OPENINGS });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      status: "error",
    };
  }
};

/**
 * Answers solver requests posted to the current worker. Each app starts it from a worker
 * script its own bundler emits, so the script always shares the page's origin.
 */
export const serveSolverRequests = (): void => {
  globalThis.addEventListener(
    "message",
    (event: MessageEvent<SolveRequest>) => {
      const response: SolverResponse = {
        generation: event.data.generation,
        result: run(event.data),
      };
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker has no target origin
      globalThis.postMessage(response);
    }
  );
};
