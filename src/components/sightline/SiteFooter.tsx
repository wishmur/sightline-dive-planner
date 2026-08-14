import { Link } from "@tanstack/react-router";
import { FeedbackDialog } from "@/components/sightline/FeedbackDialog";

export function SiteFooter() {
  return (
    <footer className="theme-light border-t border-border px-6 py-12 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 sm:items-start">
        <div className="min-w-0">
          <Link to="/" className="font-wordmark text-xl font-semibold tracking-[0.14em] text-foreground">
            SIGHTLINE<span className="text-primary">.</span>
          </Link>
          <p className="mt-1.5 text-xs tracking-[0.18em] text-muted-foreground uppercase">
            The world, from below.
          </p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Reference only. Verify operating windows with your operator.
          </p>
        </div>

        <div className="min-w-0 text-sm sm:text-right">
          <nav className="flex flex-col gap-1.5 font-medium text-foreground/80">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
              <Link to="/about" className="transition hover:text-primary">
                About Sightline
              </Link>
              <span aria-hidden className="text-muted-foreground/60">
                ·
              </span>
              <Link to="/about" hash="methodology" className="transition hover:text-primary">
                Methodology
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
              <FeedbackDialog
                kind="edit"
                triggerClassName="transition hover:text-primary"
                trigger="Suggest an edit"
              />
              <span aria-hidden className="text-muted-foreground/60">
                ·
              </span>
              <FeedbackDialog
                kind="request"
                triggerClassName="transition hover:text-primary"
                trigger="Request a destination"
              />
            </div>
          </nav>
          <p className="mt-3 text-xs text-muted-foreground">
            <Link to="/about" className="transition hover:text-primary">
              © Shailvi
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
