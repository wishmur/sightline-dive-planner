import { Link } from "@tanstack/react-router";

export function SightlineNav() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Sightline<span className="text-primary">.</span>
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          {[
            { label: "Destinations", to: "/" },
            { label: "Sightings", to: "/" },
            { label: "Trips", to: "/" },
          ].map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-white/15">
            <img
              src="https://i.pravatar.cc/80?img=15"
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </div>
        </nav>
      </div>
    </header>
  );
}