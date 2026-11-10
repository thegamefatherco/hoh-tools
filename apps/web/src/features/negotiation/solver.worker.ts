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

globalThis.addEventListener("message", (event: MessageEvent<SolveRequest>) => {
  const response: SolverResponse = {
    generation: event.data.generation,
    result: run(event.data),
  };
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker has no target origin
  globalThis.postMessage(response);
});
