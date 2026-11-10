import { ClientOnly, createFileRoute } from "@tanstack/react-router";

import Loader from "@/components/loader";
import { NegotiationSolver } from "@/features/negotiation/negotiation-solver";

const NegotiationPage = () => (
  <main>
    {/* The solver reads the remembered setup and starts a web worker, so it renders on the client only. */}
    <ClientOnly fallback={<Loader />}>
      <NegotiationSolver />
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
