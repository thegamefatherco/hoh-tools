import { serveSolverRequests } from "@hoh-tools/negotiation-ui/solver-host";

/**
 * The solver worker, built into the extension as `/solver-worker.js` in dev and prod alike.
 * Chrome kills the extension's renderer when an extension page starts a worker from
 * another origin, which is what a dev-server URL (http://localhost:5555) would be.
 */
export default defineUnlistedScript(() => {
  serveSolverRequests();
});
