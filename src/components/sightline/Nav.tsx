import { Link } from "@tanstack/react-router";

export function SightlineNav() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="font-wordmark text-2xl font-semibold text-foreground">
          Sightline<span className="text-primary">.</span>
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