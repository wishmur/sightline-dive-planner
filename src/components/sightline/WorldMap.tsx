import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110m from "world-atlas/land-110m.json";
import { ArrowUpRight, Minus, Plus, RotateCcw } from "lucide-react";
import type { Destination } from "@/lib/destinations";
import { bestMonthsLabel } from "@/lib/destinations";
import { certLabel, destinationTags } from "@/lib/cards";

const W = 960;
const H = 470;
const MIN_ZOOM = 1;
const MAX_ZOOM = 14;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type View = { k: number; x: number; y: number };
const WORLD: View = { k: 1, x: 0, y: 0 };

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

export function WorldMap({
  destinations,
  onSelect,
  activeId,
  onHoverPin,
  heightClass = "h-[26rem] sm:h-[32rem] lg:h-[38rem]",
}: {
  destinations: Destination[];
  onSelect: (destination: Destination) => void;
  activeId?: string | null;
  onHoverPin?: (id: string | null) => void;
  heightClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(WORLD);
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const pins = useMemo(
    () =>
      destinations.map((d) => {
        const p = GEO.projection([d.coordinates.lng, d.coordinates.lat]);
        return { d, x: p?.[0] ?? 0, y: p?.[1] ?? 0 };
      }),
    [destinations],
  );

  // Reset the picked preview when it drops out of the result set.
  useEffect(() => {
    if (picked && !destinations.some((d) => d.id === picked)) setPicked(null);
  }, [destinations, picked]);

  /** Zoom about a point expressed in viewBox units. */
  const zoomAbout = useCallback((nextK: number, px: number, py: number) => {
    setView((v) => {
      const k = clamp(nextK, MIN_ZOOM, MAX_ZOOM);
      const ratio = k / v.k;
      return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
    });
  }, []);

  const toViewBox = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { px: W / 2, py: H / 2 };
    return {
      px: ((clientX - rect.left) / rect.width) * W,
      py: ((clientY - rect.top) / rect.height) * H,
    };
  }, []);

  // Wheel + trackpad pinch zoom (native listener so preventDefault applies).
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    const { px, py } = toViewBox(e.clientX, e.clientY);
    zoomAbout(viewRef.current.k * Math.exp(-dy * 0.0018), px, py);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Drag to pan + two-finger pinch on touch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    moved.current = false;
    if (pointers.current.size === 1) setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const list = [...pointers.current.values()];

    if (list.length >= 2) {
      const [a, b] = list;
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const cx = (a!.x + b!.x) / 2;
      const cy = (a!.y + b!.y) / 2;
      if (pinch.current) {
        const { px, py } = toViewBox(cx, cy);
        zoomAbout((viewRef.current.k * dist) / pinch.current.dist, px, py);
      }
      pinch.current = { dist, cx, cy };
      moved.current = true;
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - prev.x) / rect.width) * W;
    const dy = ((e.clientY - prev.y) / rect.height) * H;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) moved.current = true;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) setDragging(false);
  }

  const shownId = hover ?? picked ?? activeId ?? null;
  const active = pins.find((p) => p.d.id === shownId);
  const previewX = active ? ((active.x * view.k + view.x) / W) * 100 : 0;
  const previewY = active ? ((active.y * view.k + view.y) / H) * 100 : 0;
  const inView = previewX > -5 && previewX < 105 && previewY > -5 && previewY < 105;

  const pinR = 5 / view.k;
  const zoomed = view.k > 1.02 || Math.abs(view.x) > 1 || Math.abs(view.y) > 1;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-[1.75rem] ring-1 ring-inset ring-border ${heightClass} ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full select-none"
        role="img"
        aria-label="Interactive world map of dive destinations"
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

        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          <path
            d={GEO.graticulePath}
            fill="none"
            stroke="var(--map-graticule)"
            strokeWidth={0.6 / view.k}
          />
          <path
            d={GEO.landPath}
            fill="var(--map-land)"
            stroke="var(--map-land-stroke)"
            strokeWidth={0.7 / view.k}
            strokeLinejoin="round"
          />

          {pins.map(({ d, x, y }) => {
            const isActive = shownId === d.id;
            return (
              <g
                key={d.id}
                transform={`translate(${x},${y})`}
                className="cursor-pointer"
                onMouseEnter={() => {
                  setHover(d.id);
                  onHoverPin?.(d.id);
                }}
                onMouseLeave={() => {
                  setHover((h) => (h === d.id ? null : h));
                  onHoverPin?.(null);
                }}
                onClick={() => {
                  if (!moved.current) setPicked(d.id);
                }}
              >
                <title>{`${d.name} — ${d.country}`}</title>
                <circle r={pinR * 3.6} fill="url(#sl-pin-glow)" opacity={isActive ? 1 : 0.7} />
                <circle
                  r={isActive ? pinR * 1.4 : pinR}
                  fill={isActive ? "var(--accent)" : "var(--primary)"}
                  stroke="oklch(1 0 0 / 85%)"
                  strokeWidth={(isActive ? 2 : 1.4) / view.k}
                  className="transition-all"
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <MapControl
          label="Zoom in"
          onClick={() => zoomAbout(view.k * 1.6, W / 2, H / 2)}
          disabled={view.k >= MAX_ZOOM}
        >
          <Plus className="h-4 w-4" />
        </MapControl>
        <MapControl
          label="Zoom out"
          onClick={() => zoomAbout(view.k / 1.6, W / 2, H / 2)}
          disabled={view.k <= MIN_ZOOM}
        >
          <Minus className="h-4 w-4" />
        </MapControl>
        <MapControl
          label="Reset to world view"
          onClick={() => {
            setView(WORLD);
            setPicked(null);
          }}
          disabled={!zoomed}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </MapControl>
      </div>

      {active && inView && (
        <div
          className="glass absolute z-10 w-[16rem] -translate-x-1/2 -translate-y-[calc(100%+0.9rem)] rounded-2xl p-4 text-left shadow-xl"
          style={{ left: `${previewX}%`, top: `${previewY}%` }}
        >
          <p className="truncate text-sm font-semibold text-foreground">{active.d.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {active.d.region}, {active.d.country}
          </p>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {destinationTags(active.d).slice(0, 2).join(" · ")}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {certLabel(active.d.conditions.min_cert)} · {active.d.conditions.current} current
          </p>
          <p className="mt-1 text-xs font-medium text-primary">
            {bestMonthsLabel(active.d.best_months_overall) ?? "Season varies"}
          </p>
          <button
            onClick={() => onSelect(active.d)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            View destination
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function MapControl({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass flex h-8 w-8 items-center justify-center rounded-xl text-foreground shadow-sm transition hover:text-primary disabled:opacity-35"
    >
      {children}
    </button>
  );
}
