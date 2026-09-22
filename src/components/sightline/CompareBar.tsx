import { Link } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { getDestination } from "@/lib/destinations";
import { logEvent } from "@/lib/analytics";
import type { BriefSearch } from "@/lib/filters";

/** The shortlist, pinned to the bottom of the viewport while it has anything in it. */
export function CompareBar({
  ids,
  brief,
  onRemove,
  onClear,
}: {
  ids: string[];
  brief: BriefSearch;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (ids.length === 0) return null;
  const destinations = ids.map((id) => getDestination(id)!).filter(Boolean);

  return (
    <div className="theme-light pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-card px-3 py-2.5 shadow-lg ring-1 ring-inset ring-border sm:rounded-full sm:px-4">
        <span className="pl-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Compare
        </span>
        {destinations.map((d) => (
          <button
            key={d.id}
            onClick={() => onRemove(d.id)}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/25 transition hover:bg-primary/16"
          >
            {d.name} <X className="h-3 w-3" aria-label={`Remove ${d.name}`} />
          </button>
        ))}
        {destinations.length < 2 ? (
          <span className="px-1 text-xs text-muted-foreground">Pick one more</span>
        ) : (
          <Link
            to="/compare"
            search={{ ...brief, ids: ids.join(",") }}
            onClick={() => logEvent("compare_open", { from: "compare_bar", ids })}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Compare side by side <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        <button
          onClick={onClear}
          className="px-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
