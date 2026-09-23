import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="theme-light border-t border-border py-10">
      <div className="page-frame flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/"
            className="font-wordmark text-xl font-semibold tracking-[0.14em] text-foreground"
          >
            SIGHTLINE<span className="text-primary">.</span>
          </Link>
          <p className="mt-1.5 text-xs tracking-[0.18em] text-muted-foreground uppercase">
            The world, from below.
          </p>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-right">
          Reference only. Check operating windows with your operator.
          <span className="mt-1 block">© Shailvi</span>
        </p>
      </div>
    </footer>
  );
}
