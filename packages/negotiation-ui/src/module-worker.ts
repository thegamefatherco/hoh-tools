import type { SolverWorker } from "./solver-client";

/**
 * Starts the solver as a module worker that Vite bundles next to the page. Suits a normal
 * web page; extension pages load their worker from a file inside the extension instead.
 */
export const createModuleWorker = (): SolverWorker =>
  new Worker(new URL("solver.worker.ts", import.meta.url), { type: "module" });
