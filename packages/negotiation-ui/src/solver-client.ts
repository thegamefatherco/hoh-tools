import type { SolveRequest, SolverOutcome } from "./session";

export interface SolverResponse {
  generation: number;
  result: SolverOutcome;
}

/** The part of `Worker` the client uses, so tests can substitute a fake. */
export interface SolverWorker {
  addEventListener: {
    (
      type: "message",
      listener: (event: { data: SolverResponse }) => void
    ): void;
    (type: "error", listener: (event: { message?: string }) => void): void;
  };
  postMessage: (request: SolveRequest) => void;
  terminate: () => void;
}

export interface SolverClient {
  dispose: () => void;
  /** Sends a request. Only the response to the latest request is delivered. */
  request: (request: SolveRequest) => void;
}

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Runs solver requests off the UI thread.
 *
 * Every request carries an increasing generation number and a response is delivered
 * only when its number is the latest, so a slow old search can never overwrite a newer
 * result. A request that arrives while another is still running replaces the worker, so
 * the new one starts immediately. Every request ends in exactly one outcome, including
 * failures, so the UI never stays busy.
 */
export const createSolverClient = (
  createWorker: () => SolverWorker,
  onOutcome: (response: SolverResponse) => void
): SolverClient => {
  let worker: SolverWorker | null = null;
  let latest = 0;
  let isPending = false;
  let isDisposed = false;

  const deliver = (generation: number, result: SolverOutcome): void => {
    if (isDisposed || generation !== latest) {
      return;
    }
    isPending = false;
    onOutcome({ generation, result });
  };

  const stop = (): void => {
    worker?.terminate();
    worker = null;
  };

  const start = (): SolverWorker => {
    const created = createWorker();
    created.addEventListener("message", (event) => {
      deliver(event.data.generation, event.data.result);
    });
    created.addEventListener("error", (event) => {
      // The worker is unusable after an uncaught error; the next request gets a new one.
      stop();
      deliver(latest, {
        error: event.message ?? "The solver stopped unexpectedly",
        status: "error",
      });
    });
    return created;
  };

  return {
    dispose: () => {
      isDisposed = true;
      stop();
    },
    request: (request) => {
      latest = request.generation;
      if (isPending) {
        stop();
      }
      isPending = true;
      try {
        worker ??= start();
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker has no target origin
        worker.postMessage(request);
      } catch (error) {
        stop();
        deliver(request.generation, {
          error: describeError(error),
          status: "error",
        });
      }
    },
  };
};
