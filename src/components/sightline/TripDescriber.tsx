import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { logEvent } from "@/lib/analytics";
import { MONTHS, getDestination } from "@/lib/destinations";
import { UNSUPPORTED, getConcern } from "@/lib/concerns";
import { briefSearch, type Filters } from "@/lib/filters";
import { isEmptyTrip, parseTripRules, tripToFilters, type ParsedTrip } from "@/lib/understand";
import { understandTrip, type Engine } from "@/lib/api/plan.functions";

const EXAMPLE =
  "e.g. Mantas in September. I'm Advanced with about 40 dives, I get seasick, and my partner snorkels.";

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function TripDescriber({
  onApply,
  onPatch,
}: {
  onApply: (filters: Filters) => void;
  onPatch: (patch: Partial<Filters>) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ trip: ParsedTrip; engine: Engine } | null>(null);

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    let trip: ParsedTrip;
    let engine: Engine;
    try {
      const r = await understandTrip({ data: { text: value } });
      trip = r.trip;
      engine = r.engine;
    } catch {
      trip = parseTripRules(value);
      engine = "rules";
    }
    setBusy(false);
    setResult({ trip, engine });
    // What was understood, never what was typed.
    logEvent("trip_described", {
      engine,
      length: value.length,
      empty: isEmptyTrip(trip),
      month: trip.month,
      targets: trip.targets,
      cert: trip.cert,
      concerns: trip.concerns,
      unsupported: trip.unsupported,
      destinations: trip.destinations,
      fields: Object.entries(trip)
        .filter(([, v]) => (Array.isArray(v) ? v.length : v !== null))
        .map(([k]) => k),
    });
    if (!isEmptyTrip(trip)) onApply(tripToFilters(trip));
  }

  const trip = result?.trip;
  const filters = trip ? tripToFilters(trip) : null;
  const named = (trip?.destinations ?? []).map((id) => getDestination(id)!).filter(Boolean);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-inset ring-border sm:p-5">
      <label
        htmlFor="trip-text"
        className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
        Describe your trip
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
        <textarea
          id="trip-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (result) setResult(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={2}
          maxLength={1000}
          placeholder={EXAMPLE}
          className="min-h-[3.25rem] w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={() => void submit()}
          disabled={!text.trim() || busy}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-40 sm:self-end"
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          {busy ? "Reading" : "Plan it"}
        </button>
      </div>

      {trip && (
        <div
          className="mt-4 space-y-2 border-t border-border pt-4 text-sm leading-relaxed"
          aria-live="polite"
        >
          {isEmptyTrip(trip) ? (
            <p className="text-muted-foreground">
              Nothing in that sets a month, an animal, your certification or a place, so the results
              haven't changed. Try something like “whale sharks in March, Open Water”.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Set the filters below from what you wrote. Change anything that's wrong; they're
              ordinary filters now.
            </p>
          )}
          {trip.concerns.length > 0 && (
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">On your mind: </span>
              {list(trip.concerns.map((c) => getConcern(c)!.label.toLowerCase()))}. Each destination
              page quotes what its record says about {trip.concerns.length === 1 ? "it" : "them"},
              or says it doesn't.
            </p>
          )}
          {trip.alsoMonths.length > 0 && trip.month !== null && (
            <p className="text-muted-foreground">
              Your window also covers {list(trip.alsoMonths.map((m) => MONTHS[m]!))}.{" "}
              {trip.alsoMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => onPatch({ month: String(m) })}
                  className="mr-2 font-semibold text-primary underline decoration-dotted underline-offset-4 hover:no-underline"
                >
                  Try {MONTHS[m]}
                </button>
              ))}
            </p>
          )}
          {trip.unsupported.length > 0 && (
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">Not answered here: </span>
              {list(
                trip.unsupported.map((u) =>
                  UNSUPPORTED.find((x) => x.id === u)!.label.toLowerCase(),
                ),
              )}
              . Sightline holds no evidence on {trip.unsupported.length === 1 ? "it" : "these"}, so
              {trip.unsupported.length === 1 ? " it plays" : " they play"} no part in the ranking.
            </p>
          )}
          {named.length === 1 && filters && (
            <p>
              <Link
                to="/destinations/$slug"
                params={{ slug: named[0]!.id }}
                search={briefSearch(filters)}
                className="font-semibold text-primary underline decoration-dotted underline-offset-4 hover:no-underline"
              >
                See how {named[0]!.name} fits your trip →
              </Link>
            </p>
          )}
          {named.length > 1 && filters && (
            <p>
              <Link
                to="/compare"
                search={{
                  ...briefSearch(filters),
                  ids: named
                    .map((d) => d.id)
                    .slice(0, 3)
                    .join(","),
                }}
                onClick={() =>
                  logEvent("compare_open", { from: "describer", ids: named.map((d) => d.id) })
                }
                className="font-semibold text-primary underline decoration-dotted underline-offset-4 hover:no-underline"
              >
                Compare {list(named.slice(0, 3).map((d) => d.name))} for your trip →
              </Link>
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/80">
            {result?.engine === "claude"
              ? "Read by Claude. It only fills in filters; every result and quote comes from the records."
              : "Read by keyword rules. They can miss worries you state indirectly: check the filters."}
          </p>
        </div>
      )}
    </div>
  );
}
