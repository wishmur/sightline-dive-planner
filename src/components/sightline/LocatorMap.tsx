import { useMemo } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110m from "world-atlas/land-110m.json";

const W = 960;
const H = 470;

const GEO = (() => {
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
    projection,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    landPath: path(feature(land110m as any, (land110m as any).objects.land) as any) ?? "",
    graticulePath: path(geoGraticule10()) ?? "",
  };
})();

/** Static, non-interactive locator: one pin, fixed zoom centered on it. */
export function LocatorMap({
  lat,
  lng,
  label,
  zoom = 3.6,
  heightClass = "h-[15rem]",
}: {
  lat: number;
  lng: number;
  label: string;
  zoom?: number;
  heightClass?: string;
}) {
  const { x, y, tx, ty } = useMemo(() => {
    const p = GEO.projection([lng, lat]);
    const px = p?.[0] ?? W / 2;
    const py = p?.[1] ?? H / 2;
    // same math as zoomAbout(k, px, py) from the world view (k=1, x=0, y=0),
    // then re-centred so the pin sits in the middle of the frame.
    return { x: px, y: py, tx: W / 2 - zoom * px, ty: H / 2 - zoom * py };
  }, [lat, lng, zoom]);

  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] ring-1 ring-inset ring-border ${heightClass}`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none block h-full w-full select-none"
        role="img"
        aria-label={`Location of ${label} on a world map`}
      >
        <defs>
          <linearGradient id="sl-loc-ocean" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="var(--map-ocean-top)" />
            <stop offset="100%" stopColor="var(--map-ocean-bottom)" />
          </linearGradient>
          <radialGradient id="sl-loc-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill="url(#sl-loc-ocean)" />

        <g transform={`translate(${tx},${ty}) scale(${zoom})`}>
          <path
            d={GEO.graticulePath}
            fill="none"
            stroke="var(--map-graticule)"
            strokeWidth={0.6 / zoom}
          />
          <path
            d={GEO.landPath}
            fill="var(--map-land)"
            stroke="var(--map-land-stroke)"
            strokeWidth={0.7 / zoom}
            strokeLinejoin="round"
          />
          <g transform={`translate(${x},${y})`}>
            <circle r={26 / zoom} fill="url(#sl-loc-glow)" />
            <circle
              r={7 / zoom}
              fill="var(--accent)"
              stroke="oklch(1 0 0 / 85%)"
              strokeWidth={2.5 / zoom}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
