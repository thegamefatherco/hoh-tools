import { NegotiationSolver } from "@hoh-tools/negotiation-ui/negotiation-solver";
import type { SolverWorker } from "@hoh-tools/negotiation-ui/solver-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./style.css";

/**
 * Follows the system colour scheme. The web app does this with an inline script, which
 * the extension's content security policy does not allow.
 */
const followColorScheme = (): void => {
  const query = matchMedia("(prefers-color-scheme: dark)");
  const apply = (): void => {
    document.documentElement.classList.toggle("dark", query.matches);
  };
  apply();
  query.addEventListener("change", apply);
};

/** Loads the worker from the extension's own files; see entrypoints/solver-worker.ts. */
const createWorker = (): SolverWorker =>
  new Worker(browser.runtime.getURL("/solver-worker.js"));

const root = document.querySelector("#root");
if (root === null) {
  throw new Error("The side panel page has no #root element");
}

followColorScheme();
createRoot(root).render(
  <StrictMode>
    <main>
      <NegotiationSolver createWorker={createWorker} />
    </main>
  </StrictMode>
);
