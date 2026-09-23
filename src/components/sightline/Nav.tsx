import { Link } from "@tanstack/react-router";
import { FeedbackDialog } from "@/components/sightline/FeedbackDialog";

const ITEM =
  "text-[0.8125rem] font-medium tracking-wide text-foreground/90 transition hover:text-foreground hover:underline underline-offset-4";

export function SightlineNav() {
  return (
    <header className="absolute top-0 right-0 left-0 z-50 backdrop-blur-sm">
      <div className="page-frame flex items-center justify-between py-6">
        <Link to="/" className="group flex flex-col leading-none">
          <span className="font-wordmark text-xl font-semibold tracking-[0.14em] text-foreground sm:text-2xl">
            SIGHTLINE<span className="text-primary">.</span>
          </span>
          <span className="mt-1 hidden text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase sm:block">
            The world, from below.
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link to="/" className={ITEM}>
            Home
          </Link>
          <Link to="/about" className={ITEM}>
            About
          </Link>
          <FeedbackDialog kind="edit" triggerClassName={ITEM} trigger="Feedback" />
        </nav>
      </div>
    </header>
  );
}
