import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { logEvent } from "@/lib/analytics";
import type { BriefSearch } from "@/lib/filters";
import { monthRanges, type DestinationFit } from "@/lib/fit";

const SHOWN = 4;

/**
 * Destinations that break exactly one part of the brief. Replaces the dead-end
 * "no results" state with the thing a diver actually needs: what to change.
 */
export function NearMisses({
  misses,
  brief,
  emptyResults,
}: {
  misses: DestinationFit[];
  brief: BriefSearch;
  emptyResults: boolean;
}) {
  const [all, setAll] = useState(false);
  if (misses.length === 0) return null;
  const shown = all ? misses : misses.slice(0, SHOWN);

  return (
    <section className="mt-12" aria-labelledby="near-misses-title">
      <p className="eyebrow">Close, but…</p>
      <h3 id="near-misses-title" className="mt-2 font-display text-xl text-foreground sm:text-2xl">
        {emptyResults ? "Nothing fits every part of your trip" : "One thing doesn't fit"}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Each of these breaks exactly one part of your brief.
      </p>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {shown.map((fit) => {
          const d = fit.destination;
          return (
            <li key={d.id}>
              <Link
                to="/destinations/$slug"
                params={{ slug: d.id }}
                search={brief}
                onClick={() =>
                  logEvent("view_destination", {
                    destination: d.id,
                    from: "near_miss",
                    reason: fit.violation?.reason,
                  })
                }
                className="group flex h-full items-start justify-between gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-inset ring-border transition hover:ring-primary/40"
              >
                <span className="min-w-0">
                  <span className="block font-display text-lg leading-tight text-foreground group-hover:text-primary">
                    {d.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {d.region}, {d.country}
                  </span>
                  <span className="mt-2 block text-sm text-foreground/85">
                    {fit.violation?.label}
                  </span>
                  {fit.fitsIn.length > 0 && (
                    <span className="mt-1 block text-xs font-medium text-primary">
                      Fits your brief in {monthRanges(fit.fitsIn)}
                    </span>
                  )}
                </span>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            </li>
          );
        })}
      </ul>

      {misses.length > SHOWN && (
        <button
          onClick={() => setAll((v) => !v)}
          className="mt-4 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
        >
          {all ? "Show fewer" : `Show ${misses.length - SHOWN} more`}
        </button>
      )}
    </section>
  );
}
