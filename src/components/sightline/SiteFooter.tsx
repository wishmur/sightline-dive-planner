import { Link } from "@tanstack/react-router";
import { feedbackUrl } from "@/lib/feedback";

export function SiteFooter() {
  return (
    <footer className="theme-light border-t border-border px-6 py-12 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-wordmark text-xl font-semibold text-foreground">
            Sightline<span className="text-primary">.</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Independent dive intelligence.</p>
        </div>

        <div className="text-sm">
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <Link to="/about" className="transition hover:text-primary">
              About Sightline
            </Link>
            <span aria-hidden>·</span>
            <Link to="/about" hash="methodology" className="transition hover:text-primary">
              Methodology
            </Link>
            <span aria-hidden>·</span>
            <a
              href={feedbackUrl("edit")}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-primary"
            >
              Suggest an edit
            </a>
            <span aria-hidden>·</span>
            <a
              href={feedbackUrl("request")}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-primary"
            >
              Request a destination
            </a>
          </nav>
          <p className="mt-3 text-xs text-muted-foreground">
            Built &amp; maintained by{" "}
            <Link to="/about" className="underline decoration-dotted underline-offset-4 hover:text-primary">
              Shailvi Kumar
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
