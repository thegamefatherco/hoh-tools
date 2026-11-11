import { describe, expect, test } from "bun:test";

import type { SolveRequest, SolverOutcome } from "./session";
import { createSolverClient } from "./solver-client";
import type { SolverResponse, SolverWorker } from "./solver-client";

interface FakeWorker extends SolverWorker {
  fail: (message: string) => void;
  isTerminated: boolean;
  received: SolveRequest[];
  reply: (generation: number) => void;
}

const OUTCOME: SolverOutcome = {
  count: 0,
  status: "inconsistent",
  turnsLeft: 0,
};

const requestFor = (generation: number): SolveRequest => ({
  generation,
  input: { T: 3, history: [], k: 5, n: 4 },
});

const createHarness = (options: { throwOnPost?: boolean } = {}) => {
  const workers: FakeWorker[] = [];
  const outcomes: SolverResponse[] = [];
  const createWorker = (): SolverWorker => {
    const listeners: {
      error?: (event: { message?: string }) => void;
      message?: (event: { data: SolverResponse }) => void;
    } = {};
    const worker: FakeWorker = {
      addEventListener: (
        type: "error" | "message",
        listener: (event: { data: SolverResponse; message?: string }) => void
      ) => {
        listeners[type] = listener as (event: object) => void;
      },
      fail: (message) => {
        listeners.error?.({ message });
      },
      isTerminated: false,
      postMessage: (request) => {
        if (options.throwOnPost) {
          throw new Error("cannot post");
        }
        worker.received.push(request);
      },
      received: [],
      reply: (generation) => {
        listeners.message?.({ data: { generation, result: OUTCOME } });
      },
      terminate: () => {
        worker.isTerminated = true;
      },
    };
    workers.push(worker);
    return worker;
  };
  const client = createSolverClient(createWorker, (response) => {
    outcomes.push(response);
  });
  return { client, outcomes, workers };
};

describe("solver client", () => {
  test("delivers the response to the latest request", () => {
    const { client, outcomes, workers } = createHarness();
    client.request(requestFor(1));
    workers[0].reply(1);
    expect(outcomes).toEqual([{ generation: 1, result: OUTCOME }]);
  });

  test("reuses the worker between finished requests", () => {
    const { client, workers } = createHarness();
    client.request(requestFor(1));
    workers[0].reply(1);
    client.request(requestFor(2));
    expect(workers.length).toBe(1);
    expect(workers[0].received.map((request) => request.generation)).toEqual([
      1, 2,
    ]);
  });

  test("a newer request replaces a running one and its late reply is dropped", () => {
    const { client, outcomes, workers } = createHarness();
    client.request(requestFor(1));
    client.request(requestFor(2));
    expect(workers.length).toBe(2);
    expect(workers[0].isTerminated).toBe(true);

    workers[0].reply(1);
    expect(outcomes).toEqual([]);
    workers[1].reply(2);
    expect(outcomes).toEqual([{ generation: 2, result: OUTCOME }]);
  });

  test("a worker crash reports an error for the latest request", () => {
    const { client, outcomes, workers } = createHarness();
    client.request(requestFor(4));
    workers[0].fail("out of memory");
    expect(outcomes).toEqual([
      { generation: 4, result: { error: "out of memory", status: "error" } },
    ]);
    client.request(requestFor(5));
    expect(workers.length).toBe(2);
  });

  test("a failure to start or post reports an error instead of hanging", () => {
    const { client, outcomes } = createHarness({ throwOnPost: true });
    client.request(requestFor(1));
    expect(outcomes).toEqual([
      { generation: 1, result: { error: "cannot post", status: "error" } },
    ]);
  });

  test("nothing is delivered after dispose", () => {
    const { client, outcomes, workers } = createHarness();
    client.request(requestFor(1));
    client.dispose();
    workers[0].reply(1);
    expect(outcomes).toEqual([]);
    expect(workers[0].isTerminated).toBe(true);
  });
});
