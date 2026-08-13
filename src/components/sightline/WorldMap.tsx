import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110m from "world-atlas/land-110m.json";
import { ArrowUpRight } from "lucide-react";
import type { Destination } from "@/lib/destinations";
import { bestMonthsLabel } from "@/lib/destinations";
import { destinationTags } from "@/lib/cards";

const W = 960;
const H = 470;

export function WorldMap({
  destinations,
  all,
  onSelect,
  activeId,
}: {
  destinations: Destination[];
  all?: Destination[];
  onSelect: (destination: Destination) => void;
  activeId?: string | null;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const matchedIds = useMemo(() => new Set(destinations.map((d) => d.id)), [destinations]);
  const list = all ?? destinations;

  const { landPath, graticulePath, pins } = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [10, 14],
        [W - 10, H - 14],
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feature(land110m as any, (land110m as any).objects.land) as any,
    );
    const path = geoPath(projection);
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      landPath: path(feature(land110m as any, (land110m as any).objects.land) as any) ?? "",
      graticulePath: path(geoGraticule10()) ?? "",
      pins: list.map((d) => {
        const p = projection([d.coordinates.lng, d.coordinates.lat]);
        return { d, x: p?.[0] ?? 0, y: p?.[1] ?? 0 };
      }),
    };
  }, [list]);

  const shownId = hover ?? activeId ?? null;
  const active = pins.find((p) => p.d.id === shownId && matchedIds.has(p.d.id));

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] ring-1 ring-inset ring-border">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="World map of dive destinations"
      >
        <defs>
          <linearGradient id="sl-ocean" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="var(--map-ocean-top)" />
            <stop offset="100%" stopColor="var(--map-ocean-bottom)" />
          </linearGradient>
          <radialGradient id="sl-pin-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill="url(#sl-ocean)" />
        <path d={graticulePath} fill="none" stroke="var(--map-graticule)" strokeWidth={0.6} />
        <path
          d={landPath}
          fill="var(--map-land)"
          stroke="var(--map-land-stroke)"
          strokeWidth={0.7}
          strokeLinejoin="round"
        />

        {pins.map(({ d, x, y }) => {
          const matched = matchedIds.has(d.id);
          const isActive = shownId === d.id;
          return (
            <g
              key={d.id}
              transform={`translate(${x},${y})`}
              className={matched ? "cursor-pointer" : "pointer-events-none"}
              opacity={matched ? 1 : 0.18}
              onMouseEnter={() => matched && setHover(d.id)}
              onMouseLeave={() => setHover((h) => (h === d.id ? null : h))}
              onClick={() => matched && onSelect(d)}
            >
              <title>{`${d.name} — ${d.country}`}</title>
              {matched && (
                <circle r={isActive ? 22 : 14} fill="url(#sl-pin-glow)" className="transition-all" />
              )}
              <circle
                r={isActive ? 7 : 5}
                fill={isActive ? "var(--accent)" : "var(--primary)"}
                stroke="oklch(1 0 0 / 85%)"
                strokeWidth={isActive ? 2 : 1.4}
                className="transition-all"
              />
            </g>
          );
        })}
      </svg>

      {active && (
        <button
          onClick={() => onSelect(active.d)}
          className="glass absolute z-10 w-[15rem] -translate-x-1/2 -translate-y-[calc(100%+0.9rem)] rounded-2xl p-4 text-left shadow-xl transition"
          style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100}%` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{active.d.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {active.d.region}, {active.d.country}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
          </div>
          <p className="mt-2 truncate text-xs text-muted-foreground">
            {destinationTags(active.d).slice(0, 2).join(" · ")}
          </p>
          <p className="mt-1 text-xs font-medium text-primary">
            {bestMonthsLabel(active.d.best_months_overall) ?? "Season varies"}
          </p>
        </button>
      )}
    </div>
  );
}
