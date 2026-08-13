import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110m from "world-atlas/land-110m.json";
import type { Destination } from "@/lib/destinations";

const W = 960;
const H = 480;

export function WorldMap({
  destinations,
  onSelect,
  bare = false,
}: {
  destinations: Destination[];
  onSelect: (destination: Destination) => void;
  bare?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const { landPath, graticulePath, pins } = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [12, 12],
        [W - 12, H - 12],
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feature(land110m as any, (land110m as any).objects.land) as any,
    );
    const path = geoPath(projection);
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      landPath: path(feature(land110m as any, (land110m as any).objects.land) as any) ?? "",
      graticulePath: path(geoGraticule10()) ?? "",
      pins: destinations.map((d) => {
        const p = projection([d.coordinates.lng, d.coordinates.lat]);
        return { d, x: p?.[0] ?? 0, y: p?.[1] ?? 0 };
      }),
    };
  }, [destinations]);

  const active = pins.find((p) => p.d.id === hover);

  return (
    <div
      className={
        bare
          ? "relative overflow-hidden"
          : "glass-subtle relative overflow-hidden rounded-3xl p-2"
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="World map of dive destinations">
        <path d={graticulePath} fill="none" stroke="var(--map-graticule)" strokeWidth={0.5} />
        <path d={landPath} fill="var(--map-land)" stroke="var(--map-land-stroke)" strokeWidth={0.6} />
        {pins.map(({ d, x, y }) => (
          <g
            key={d.id}
            transform={`translate(${x},${y})`}
            className="cursor-pointer"
            onMouseEnter={() => setHover(d.id)}
            onMouseLeave={() => setHover((h) => (h === d.id ? null : h))}
            onClick={() => onSelect(d)}
          >
            <title>{`${d.name} — ${d.country}`}</title>
            <circle r={10} className="fill-primary/15" />
            <circle
              r={hover === d.id ? 5 : 3.4}
              className={hover === d.id ? "fill-accent" : "fill-primary"}
              stroke="var(--background)"
              strokeWidth={1}
            />
          </g>
        ))}
      </svg>

      {active && (
        <div
          className="glass pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 text-xs"
          style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100}%` }}
        >
          <p className="font-medium text-foreground">{active.d.name}</p>
          <p className="text-muted-foreground">{active.d.country}</p>
        </div>
      )}
    </div>
  );
}