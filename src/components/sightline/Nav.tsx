import { Link } from "@tanstack/react-router";

export function SightlineNav() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Sightline<span className="text-primary">.</span>
        </Link>
        <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground md:block">
          Dive destination reference
        </p>
      </div>
    </header>
  );
}