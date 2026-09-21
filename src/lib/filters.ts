import { DESTINATIONS, SPECIES_GROUPS, type Destination } from "@/lib/destinations";
import { COLLECTIONS, getCollection } from "@/lib/collections";
import { diveTypeLabel } from "@/lib/cards";
import { GROUP_DEFS, getGroupDef } from "@/lib/taxonomy";

/** Country -> continent grouping for the "Where" filter. */
export const CONTINENTS: { name: string; countries: string[] }[] = (() => {
  const map: Record<string, string> = {
    Indonesia: "Asia",
    Philippines: "Asia",
    Maldives: "Asia",
    Japan: "Asia",
    Australia: "Oceania",
    Palau: "Oceania",
    "French Polynesia": "Oceania",
    Mexico: "North America",
    "United States": "North America",
    Bahamas: "North America",
    "Costa Rica": "Central America",
    Ecuador: "South America",
    Portugal: "Europe",
    Iceland: "Europe",
    Malta: "Europe",
    Egypt: "Africa",
    "South Africa": "Africa",
  };
  const order = [
    "Asia",
    "Oceania",
    "North America",
    "Central America",
    "South America",
    "Europe",
    "Africa",
  ];
  const present = new Set(DESTINATIONS.map((d) => d.country));
  return order
    .map((name) => ({
      name,
      countries: [...present].filter((c) => map[c] === name).sort(),
    }))
    .filter((c) => c.countries.length > 0);
})();

export function continentOf(country: string): string | null {
  return CONTINENTS.find((c) => c.countries.includes(country))?.name ?? null;
}

/** Marine-life targets: diver-facing groups first, then canonical species. */
export type TargetOption = { id: string; label: string; kind: "group" | "species" };

export const TARGET_GROUPS: TargetOption[] = GROUP_DEFS.filter(
  (g) => g.members.filter((m) => SPECIES_GROUPS.some((s) => s.slug === m)).length >= 2,
).map((g) => ({ id: g.id, label: g.label, kind: "group" as const }));

export const TARGET_SPECIES: TargetOption[] = SPECIES_GROUPS.map((g) => ({
  id: g.slug,
  label: g.name,
  kind: "species" as const,
}));

export function isKnownTarget(id: string) {
  return TARGET_GROUPS.some((t) => t.id === id) || TARGET_SPECIES.some((t) => t.id === id);
}

export function targetLabel(id: string) {
  return getGroupDef(id)?.label ?? SPECIES_GROUPS.find((g) => g.slug === id)?.name ?? id;
}

/** The diver's own certification. Matches every destination at or below it. */
export const CERT_OPTIONS = [
  { value: "open_water", label: "Open Water" },
  { value: "advanced", label: "Advanced" },
  { value: "advanced_plus_experience", label: "Advanced + experience" },
];

/** The most current the diver is comfortable with. */
export const CURRENT_OPTIONS = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
];

export const TEMP_OPTIONS = [
  { value: "warm", label: "Warm · 26°C and up" },
  { value: "temperate", label: "Temperate · 18–25°C" },
  { value: "cold", label: "Cold · below 18°C" },
];

export const ENTRY_OPTIONS = [
  { value: "shore", label: "Shore" },
  { value: "boat", label: "Boat" },
];

/** Dive types derived from the highlight types present in the dataset. */
export const DIVE_TYPE_OPTIONS = (() => {
  const counts = new Map<string, number>();
  for (const d of DESTINATIONS) {
    for (const t of new Set(d.highlights.map((h) => h.type))) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => ({ value, label: diveTypeLabel(value) }));
})();

export const FORMAT_OPTIONS = [
  { value: "shore_access", label: "Shore access" },
  { value: "land_based_daily", label: "Land-based daily" },
  { value: "day_trip_from_hub", label: "Day trip from hub" },
  { value: "liveaboard", label: "Liveaboard" },
  { value: "expedition", label: "Expedition" },
];

export type Filters = {
  query: string;
  where: string; // "all" | "continent:Asia" | "country:Indonesia"
  month: string; // "any" | "0".."11"
  species: string[]; // target IDs: taxonomy group IDs or canonical species IDs
  diveType: string; // "any" | highlight type
  cert: string; // "any" | the diver's certification (a ladder, not an exact match)
  current: string; // "any" | the most current the diver is comfortable with
  temp: string; // "any" | warm|temperate|cold
  format: string; // "any" | format value
  entry: string; // "any" | shore|boat
  operatingOnly: boolean;
  collection: string; // "all" | collection id
};

export const EMPTY_FILTERS: Filters = {
  query: "",
  where: "all",
  month: "any",
  species: [],
  diveType: "any",
  cert: "any",
  current: "any",
  temp: "any",
  format: "any",
  entry: "any",
  operatingOnly: false,
  collection: "all",
};

export function countActive(f: Filters) {
  let n = 0;
  if (f.query.trim()) n++;
  if (f.where !== "all") n++;
  if (f.month !== "any") n++;
  if (f.species.length) n++;
  if (f.diveType !== "any") n++;
  if (f.cert !== "any") n++;
  if (f.current !== "any") n++;
  if (f.temp !== "any") n++;
  if (f.format !== "any") n++;
  if (f.entry !== "any") n++;
  if (f.operatingOnly) n++;
  if (f.collection !== "all") n++;
  return n;
}

function tempBand(range: number[]): string[] {
  const [lo = 0, hi = 0] = range;
  const bands: string[] = [];
  if (hi >= 26) bands.push("warm");
  if (hi >= 18 && lo <= 25) bands.push("temperate");
  if (lo < 18) bands.push("cold");
  return bands;
}

/** Case- and accent-insensitive: "galapagos" finds "Galápagos". */
function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Scope filters narrow where to look; they don't judge fit. Month, marine life,
 * certification and current are the diver's brief and are judged in lib/fit.ts.
 */
export function passesScope(d: Destination, f: Filters) {
  const q = fold(f.query.trim());
  if (q && !fold(`${d.name} ${d.region} ${d.country}`).includes(q)) return false;

  if (f.collection !== "all") {
    const collection = getCollection(f.collection);
    if (collection && !collection.match(d)) return false;
  }

  if (f.where !== "all") {
    const [kind, value] = f.where.split(":");
    if (kind === "country" && d.country !== value) return false;
    if (kind === "continent" && continentOf(d.country) !== value) return false;
  }

  if (f.diveType !== "any" && !d.highlights.some((h) => h.type === f.diveType)) return false;
  if (f.temp !== "any" && !tempBand(d.conditions.water_temp_c).includes(f.temp)) return false;
  if (f.entry !== "any" && !d.conditions.entry.includes(f.entry)) return false;
  if (f.format !== "any" && !d.trip_formats.some((t) => t.format === f.format)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// URL search params. Compact, human-readable, defaults omitted.

export type FilterSearch = {
  q?: string;
  where?: string;
  m?: number; // 1–12 (a number, so the router doesn't JSON-quote it in the URL)
  sp?: string; // comma-separated target IDs
  type?: string;
  cert?: string;
  cur?: string;
  temp?: string;
  fmt?: string;
  entry?: string;
  open?: boolean;
  col?: string;
};

const SEARCH_KEYS: (keyof FilterSearch)[] = [
  "q",
  "where",
  "m",
  "sp",
  "type",
  "cert",
  "cur",
  "temp",
  "fmt",
  "entry",
  "open",
  "col",
];

export function validateFilterSearch(search: Record<string, unknown>): FilterSearch {
  const out: Record<string, unknown> = {};
  for (const key of SEARCH_KEYS) {
    const value = search[key];
    if (key === "m") {
      const m = Number(value);
      if (Number.isInteger(m) && m >= 1 && m <= 12) out.m = m;
    } else if (key === "open") {
      if (value === true || value === "1" || value === "true") out.open = true;
    } else if (typeof value === "string" && value) {
      out[key] = value;
    }
  }
  return out as FilterSearch;
}

const oneOf = (value: string | undefined, options: { value: string }[], fallback: string) =>
  value && options.some((o) => o.value === value) ? value : fallback;

export function filtersFromSearch(s: FilterSearch): Filters {
  const m = Number(s.m);
  const where = s.where ?? "all";
  const whereOk =
    where === "all" ||
    CONTINENTS.some(
      (c) => where === `continent:${c.name}` || c.countries.some((x) => where === `country:${x}`),
    );
  return {
    query: s.q ?? "",
    where: whereOk ? where : "all",
    month: Number.isInteger(m) && m >= 1 && m <= 12 ? String(m - 1) : "any",
    species: (s.sp ?? "").split(",").filter(isKnownTarget),
    diveType: oneOf(s.type, DIVE_TYPE_OPTIONS, "any"),
    cert: oneOf(s.cert, CERT_OPTIONS, "any"),
    current: oneOf(s.cur, CURRENT_OPTIONS, "any"),
    temp: oneOf(s.temp, TEMP_OPTIONS, "any"),
    format: oneOf(s.fmt, FORMAT_OPTIONS, "any"),
    entry: oneOf(s.entry, ENTRY_OPTIONS, "any"),
    operatingOnly: s.open === true,
    collection: s.col && COLLECTIONS.some((c) => c.id === s.col) ? s.col : "all",
  };
}

export function searchFromFilters(f: Filters): FilterSearch {
  const s: FilterSearch = {};
  if (f.query.trim()) s.q = f.query;
  if (f.where !== "all") s.where = f.where;
  if (f.month !== "any") s.m = Number(f.month) + 1;
  if (f.species.length) s.sp = f.species.join(",");
  if (f.diveType !== "any") s.type = f.diveType;
  if (f.cert !== "any") s.cert = f.cert;
  if (f.current !== "any") s.cur = f.current;
  if (f.temp !== "any") s.temp = f.temp;
  if (f.format !== "any") s.fmt = f.format;
  if (f.entry !== "any") s.entry = f.entry;
  if (f.operatingOnly) s.open = true;
  if (f.collection !== "all") s.col = f.collection;
  return s;
}

/** The part of a brief a destination page needs: when, what, and the diver's limits. */
export type BriefSearch = Pick<FilterSearch, "m" | "sp" | "cert" | "cur">;

export function briefSearch(f: Filters): BriefSearch {
  const { m, sp, cert, cur } = searchFromFilters(f);
  return { m, sp, cert, cur };
}
