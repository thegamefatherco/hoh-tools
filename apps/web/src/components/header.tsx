import { Link } from "@tanstack/react-router";

const LINKS = [
  { label: "Home", to: "/" },
  { label: "Negotiation solver", to: "/treasure-hunt/negotiation" },
] as const;

const Header = () => (
  <div>
    <div className="flex flex-row items-center justify-between px-4 py-2">
      <nav className="flex flex-wrap gap-4 text-sm">
        {LINKS.map(({ to, label }) => (
          <Link
            activeOptions={{ exact: true }}
            activeProps={{ className: "font-semibold" }}
            className="focus-visible:ring-ring/50 outline-none focus-visible:ring-2"
            key={to}
            to={to}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
    <hr />
  </div>
);

export default Header;
