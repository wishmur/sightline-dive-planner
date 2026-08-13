import { Link } from "@tanstack/react-router";
import { ArrowUpRight, GraduationCap, CalendarRange } from "lucide-react";
import { bestMonthsLabel, type Destination } from "@/lib/destinations";
import { certLabel, destinationTags } from "@/lib/cards";
import { destinationImage, destinationImageAlt } from "@/lib/imagery";
import { logEvent } from "@/lib/analytics";

export function DestinationCard({
  destination: d,
  onHover,
  from = "explore",
  highlighted = false,
}: {
  destination: Destination;
  onHover?: (id: string | null) => void;
  from?: string;
  highlighted?: boolean;
}) {
  const tags = destinationTags(d).slice(0, 3);
  const season = bestMonthsLabel(d.best_months_overall) ?? "Season varies";

  return (
    <Link
      to="/destinations/$slug"
      params={{ slug: d.id }}
      onClick={() => logEvent("view_destination", { destination: d.id, from })}
      onMouseEnter={() => onHover?.(d.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/40 ${
        highlighted ? "-translate-y-0.5 shadow-lg ring-primary/50" : "ring-border"
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <img
          src={destinationImage(d)}
          alt={destinationImageAlt(d)}
          loading="lazy"
          width={1024}
          height={768}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
        />
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

        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li
              key={t}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
            >
              {t}
            </li>
          ))}
        </ul>

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
    </Link>
  );
}
