import { Link } from "@tanstack/react-router";

export function SightlineNav() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="group flex flex-col leading-none">
          <span className="font-wordmark text-2xl font-semibold tracking-[0.14em] text-foreground">
            SIGHTLINE<span className="text-primary">.</span>
          </span>
          <span className="mt-1 hidden text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase sm:block">
            The world, from below.
          </span>
        </Link>
        <Link
          to="/about"
          className="text-sm font-medium text-foreground/80 transition hover:text-primary"
        >
          About the diver
        </Link>
      </div>
    </header>
  );
}