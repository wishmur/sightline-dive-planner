import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  GraduationCap,
  CalendarRange,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { bestMonthsLabel, type Destination } from "@/lib/destinations";
import { certLabel, destinationTagChips } from "@/lib/cards";
import { destinationImage, destinationImageAlt } from "@/lib/imagery";
import { logEvent } from "@/lib/analytics";
import type { BriefSearch, Filters } from "@/lib/filters";
import { FLAG_LABEL, topFlags, type DestinationFit } from "@/lib/fit";

export function DestinationCard({
  destination: d,
  onHover,
  onTag,
  from = "explore",
  highlighted = false,
  fit,
  brief,
  compared = false,
  compareFull = false,
  onCompare,
}: {
  destination: Destination;
  onHover?: (id: string | null) => void;
  onTag?: (patch: Partial<Filters>) => void;
  from?: string;
  highlighted?: boolean;
  /** Present only when the diver has a brief; renders the one-line fit summary. */
  fit?: DestinationFit;
  brief?: BriefSearch;
  /** Shortlist for side-by-side comparison (home page only). */
  compared?: boolean;
  compareFull?: boolean;
  onCompare?: (id: string) => void;
}) {
  const tags = destinationTagChips(d).slice(0, 3);
  const season = bestMonthsLabel(d.best_months_overall) ?? "Season varies";

  return (
    <div
      onMouseEnter={() => onHover?.(d.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/40 ${
        highlighted ? "-translate-y-0.5 shadow-lg ring-primary/50" : "ring-border"
      }`}
    >
      <Link
        to="/destinations/$slug"
        params={{ slug: d.id }}
        search={brief}
        onClick={() => logEvent("view_destination", { destination: d.id, from, tier: fit?.tier })}
        aria-label={`${d.name}, ${d.country}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:ring-2 focus-visible:ring-primary"
      />
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <img
          src={destinationImage(d)}
          alt={destinationImageAlt(d)}
          loading="lazy"
          width={1024}
          height={768}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
        />
        {onCompare && (
          <button
            type="button"
            onClick={() => onCompare(d.id)}
            disabled={!compared && compareFull}
            aria-pressed={compared}
            title={!compared && compareFull ? "You can compare up to three" : undefined}
            className={`absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-inset backdrop-blur-md transition disabled:opacity-50 ${
              compared
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-white/85 text-slate-900 ring-black/5 hover:bg-white"
            }`}
          >
            {compared ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <Plus className="h-3 w-3" aria-hidden />
            )}
            {compared ? "Comparing" : "Compare"}
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg text-foreground group-hover:text-primary">
              {d.name}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {d.region}, {d.country}
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
        </div>

        <ul className="relative z-20 mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li key={t.label}>
              <button
                type="button"
                onClick={() => onTag?.(t.patch)}
                title={onTag ? `Filter by ${t.label}` : undefined}
                className={`rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition ${
                  onTag
                    ? "cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    : "cursor-default"
                }`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>

        {fit && <FitLine fit={fit} />}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-primary">
            <CalendarRange className="h-3.5 w-3.5" />
            {season}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            {certLabel(d.conditions.min_cert)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** What fits and the single most important catch, from deterministic verdicts only. */
function FitLine({ fit }: { fit: DestinationFit }) {
  const positive =
    fit.verdicts.find((v) => v.kind === "target" && v.status !== "violated") ??
    fit.verdicts.find((v) => v.kind === "season" && v.status !== "violated") ??
    fit.verdicts.find((v) => v.status === "met");
  const flags = topFlags(fit);
  const [first, ...rest] = flags;
  if (!positive && !first) return null;

  return (
    <ul className="mt-3 space-y-1 text-xs leading-snug">
      {positive && (
        <li className="flex items-start gap-1.5 text-foreground/85">
          <Check className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>{positive.short}</span>
        </li>
      )}
      {first && (
        <li className="flex items-start gap-1.5 text-muted-foreground">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          <span>
            {FLAG_LABEL[first]}
            {rest.length > 0 && (
              <span className="text-muted-foreground/70"> · +{rest.length} more</span>
            )}
          </span>
        </li>
      )}
    </ul>
  );
}
