import { createModuleWorker } from "@hoh-tools/negotiation-ui/module-worker";
import { NegotiationSolver } from "@hoh-tools/negotiation-ui/negotiation-solver";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";

import Loader from "@/components/loader";

const NegotiationPage = () => (
  <main>
    {/* The solver reads the remembered setup and starts a web worker, so it renders on the client only. */}
    <ClientOnly fallback={<Loader />}>
      <NegotiationSolver createWorker={createModuleWorker} />
    </ClientOnly>
  </main>
);

export const Route = createFileRoute("/treasure-hunt/negotiation")({
  component: NegotiationPage,
  head: () => ({
    meta: [
      { title: "Negotiation solver · HoH Tools" },
      {
        content:
          "Optimal placements for the Heroes of History Treasure Hunt negotiation mini-game.",
        name: "description",
      },
    ],
  }),
});
