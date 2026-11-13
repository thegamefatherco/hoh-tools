import { Link, createFileRoute } from "@tanstack/react-router";

const HomeComponent = () => (
  <main>
    <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6">
      <header className="grid gap-1">
        <h1 className="text-lg font-semibold">HoH Tools</h1>
        <p className="text-muted-foreground text-xs">
          Helpers for Heroes of History.
        </p>
      </header>
      <Link
        className="border-border bg-card hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 grid gap-1 border p-4 transition-colors outline-none focus-visible:ring-2 motion-reduce:transition-none"
        to="/treasure-hunt/negotiation"
      >
        <span className="text-sm font-medium">Negotiation solver</span>
        <span className="text-muted-foreground text-xs">
          Treasure Hunt negotiations: the optimal placement for every turn, with
          the exact chance of clearing.
        </span>
      </Link>
    </div>
  </main>
);

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
