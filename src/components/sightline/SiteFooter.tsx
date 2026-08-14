import { Link } from "@tanstack/react-router";
import { FeedbackDialog } from "@/components/sightline/FeedbackDialog";

export function SiteFooter() {
  return (
    <footer className="theme-light border-t border-border px-6 py-12 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="font-wordmark text-xl font-semibold tracking-[0.14em] text-foreground">
            SIGHTLINE<span className="text-primary">.</span>
          </Link>
          <p className="mt-1.5 text-xs tracking-[0.18em] text-muted-foreground uppercase">
            The world, from below.
          </p>
        </div>

        <div className="text-sm sm:text-right">
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground sm:justify-end">
            <Link to="/about" className="transition hover:text-primary">
              About Sightline
            </Link>
            <span aria-hidden>·</span>
            <Link to="/about" hash="methodology" className="transition hover:text-primary">
              Methodology
            </Link>
            <span aria-hidden>·</span>
            <FeedbackDialog
              kind="edit"
              triggerClassName="transition hover:text-primary"
              trigger="Suggest an edit"
            />
            <span aria-hidden>·</span>
            <FeedbackDialog
              kind="request"
              triggerClassName="transition hover:text-primary"
              trigger="Request a destination"
            />
          </nav>
          <p className="mt-3 text-xs text-muted-foreground">
            <Link to="/about" className="transition hover:text-primary">
              © Shailvi
            </Link>
          </p>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-7xl text-xs text-muted-foreground">
        Reference only. Verify operating windows with your operator.
      </p>
    </footer>
  );
}
