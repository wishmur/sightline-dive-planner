import { useEffect, useMemo, useState } from "react";
import { Check, CircleSlash, TriangleAlert, X } from "lucide-react";
import { ConfidenceTag } from "@/components/sightline/Confidence";
import { Sources } from "@/components/sightline/Sources";
import { ReadMore } from "@/components/sightline/ReadMore";
import { FeedbackDialog } from "@/components/sightline/FeedbackDialog";
import { SourceCheck } from "@/components/sightline/SourceCheck";
import { logEvent } from "@/lib/analytics";
import { MONTHS, type Destination } from "@/lib/destinations";
import { CERT_OPTIONS, searchFromFilters, targetLabel, type Filters } from "@/lib/filters";
import {
  FLAG_LABEL,
  evaluate,
  hasBrief,
  monthRanges,
  selectEvidence,
  type DestinationFit,
  type EvidenceItem,
  type Verdict,
} from "@/lib/fit";

/** Same chip treatment as the Marine life month selector on this page. */
function chip(on: boolean) {
  return `rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 transition ${
    on
      ? "bg-primary/12 text-primary ring-1 ring-inset ring-primary/30"
      : "text-muted-foreground/80 hover:bg-secondary/70 hover:text-foreground"
  }`;
}

const CLAIM_KIND: Record<EvidenceItem["claim"]["type"], string> = {
  operating: "Access",
  experience: "Conditions",
  species: "Marine life",
  highlight: "Highlight",
  format: "Trip format",
  cert: "Certification",
};

function summary(fit: DestinationFit, name: string) {
  if (fit.unlisted.length) {
    return `${name} has no record of ${fit.unlisted.map(targetLabel).join(" or ")}`;
  }
  switch (fit.tier) {
    case "good":
      return "A good fit for your trip";
    case "caveats":
      return `A fit, with ${fit.caveats} thing${fit.caveats === 1 ? "" : "s"} to weigh`;
    case "near_miss":
      return "Close — one thing doesn't fit";
    default:
      return "Not a fit for this trip";
  }
}

function VerdictIcon({ v }: { v: Verdict }) {
  if (v.status === "met") return <Check className="h-4 w-4 text-primary" aria-label="Fits" />;
  if (v.status === "caveat")
    return <TriangleAlert className="h-4 w-4 text-accent" aria-label="Caveat" />;
  return <X className="h-4 w-4 text-muted-foreground" aria-label="Doesn't fit" />;
}

export function TripFit({
  destination: d,
  filters,
  onChange,
}: {
  destination: Destination;
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}) {
  const active = hasBrief(filters);
  const fit = useMemo(() => evaluate(d, filters), [d, filters]);
  const evidence = useMemo(
    () => (active ? selectEvidence(fit, filters) : []),
    [active, fit, filters],
  );
  const briefKey = JSON.stringify(searchFromFilters(filters));
  const [answered, setAnswered] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setAnswered(null);
    logEvent("fit_panel_view", {
      destination: d.id,
      brief: searchFromFilters(filters),
      tier: fit.tier,
      flags: [...new Set(fit.verdicts.flatMap((v) => v.flags))],
      evidence: evidence.map((e) => e.claim.id),
    });
    // briefKey captures every input that changes what the panel shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.id, briefKey]);

  function feedback(helpful: boolean) {
    setAnswered(briefKey);
    logEvent("fit_feedback", {
      destination: d.id,
      brief: searchFromFilters(filters),
      tier: fit.tier,
      helpful,
      evidence: evidence.map((e) => e.claim.id),
    });
  }

  const month = filters.month === "any" ? null : Number(filters.month);

  return (
    <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border lg:p-8">
      {/* Brief controls */}
      <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-x-6">
        <p className="eyebrow pt-1">When</p>
        <div className="flex flex-wrap items-center gap-0.5">
          <button onClick={() => onChange({ month: "any" })} className={chip(month === null)}>
            Any month
          </button>
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => onChange({ month: String(i) })}
              className={chip(month === i)}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="eyebrow pt-1">My cert</p>
        <div className="flex flex-wrap items-center gap-0.5">
          <button
            onClick={() => onChange({ cert: "any" })}
            className={chip(filters.cert === "any")}
          >
            Not set
          </button>
          {CERT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => onChange({ cert: o.value })}
              className={chip(filters.cert === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {filters.species.length > 0 && (
          <>
            <p className="eyebrow pt-1">To see</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {filters.species.map((id) => (
                <button
                  key={id}
                  onClick={() => onChange({ species: filters.species.filter((s) => s !== id) })}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium leading-5 text-primary ring-1 ring-inset ring-primary/25 transition hover:bg-primary/16"
                >
                  {targetLabel(id)} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {!active ? (
        <p className="mt-6 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
          Pick a month and your certification to see how {d.name} fits — what works, and what to
          watch for before you book.
        </p>
      ) : (
        <>
          {/* Verdicts */}
          <div className="mt-6 border-t border-border pt-6">
            <p className="font-display text-xl text-foreground sm:text-2xl">
              {summary(fit, d.name)}
            </p>
            {fit.tier === "near_miss" && fit.fitsIn.length > 0 && (
              <p className="mt-1 text-sm font-medium text-primary">
                Fits your brief in {monthRanges(fit.fitsIn)}
              </p>
            )}
            <ul className="mt-4 space-y-2.5">
              {fit.unlisted.map((id) => (
                <li key={id} className="flex items-start gap-2.5 text-sm">
                  <CircleSlash
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="text-muted-foreground">
                    No {targetLabel(id).toLowerCase()} records here
                  </span>
                </li>
              ))}
              {fit.verdicts.map((v, i) => (
                <li
                  key={`${v.kind}-${v.targetId ?? i}`}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <span className="mt-0.5 shrink-0">
                    <VerdictIcon v={v} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={
                        v.status === "violated" ? "text-muted-foreground" : "text-foreground"
                      }
                    >
                      {v.label}
                    </span>
                    {v.flags.length > 0 && (
                      <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                        {v.flags.map((f) => (
                          <span
                            key={f}
                            className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent"
                          >
                            {FLAG_LABEL[f]}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Evidence, verbatim */}
          {evidence.length > 0 && (
            <div className="mt-7 border-t border-border pt-6">
              <p className="eyebrow">Read before you book</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                The {evidence.length} note{evidence.length === 1 ? "" : "s"} in this record that
                bear on your trip, quoted as researched.
              </p>
              <ul className="mt-4 divide-y divide-border">
                {evidence.map(({ claim }) => (
                  <li key={claim.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {CLAIM_KIND[claim.type]}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{claim.label}</span>
                      {claim.confidence && <ConfidenceTag value={claim.confidence} />}
                    </div>
                    <div className="mt-2 max-w-3xl">
                      <ReadMore text={claim.text} limit={520} />
                    </div>
                    <div className="mt-2">
                      <SourceCheck claimId={claim.id} destinationId={d.id} showUnchecked />
                    </div>
                    <div className="mt-1.5">
                      <Sources
                        urls={claim.sources}
                        context={
                          claim.inheritedSources ? "trip_fit_destination_sources" : "trip_fit"
                        }
                        destinationId={d.id}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback */}
          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
            {answered === briefKey ? (
              <span className="text-muted-foreground">Thanks — that helps us tune this.</span>
            ) : (
              <>
                <span className="text-muted-foreground">Was this useful for planning?</span>
                <button
                  onClick={() => feedback(true)}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
                >
                  Yes
                </button>
                <FeedbackDialog
                  kind="edit"
                  destinationId={d.id}
                  destinationName={d.name}
                  onOpenTrigger={() => feedback(false)}
                  triggerClassName="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
                  trigger="Something's off"
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
