import {
  DESTINATIONS,
  SPECIES_GROUPS,
  type Destination,
} from "@/lib/destinations";
import { getCollection } from "@/lib/collections";

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

export const SPECIES_NAMES = SPECIES_GROUPS.map((g) => g.name);

export const CERT_OPTIONS = [
  { value: "open_water", label: "Open Water" },
  { value: "advanced", label: "Advanced" },
  { value: "advanced_plus_experience", label: "Advanced + experience" },
];

export const CURRENT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "strong", label: "Strong" },
  { value: "variable", label: "Variable" },
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

export const FORMAT_OPTIONS = [
  { value: "shore_access", label: "Shore access" },
  { value: "land_based_daily", label: "Land-based daily" },
  { value: "day_trip_from_hub", label: "Day trip from hub" },
  { value: "liveaboard", label: "Liveaboard" },
  { value: "expedition", label: "Expedition" },
];

export function humanLabel(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export type Filters = {
  query: string;
  where: string; // "all" | "continent:Asia" | "country:Indonesia"
  month: string; // "any" | "0".."11"
  species: string[]; // species names
  cert: string; // "any" | min_cert value
  current: string; // "any" | value
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
  if (f.cert !== "any") n++;
  if (f.current !== "any") n++;
  if (f.temp !== "any") n++;
  if (f.format !== "any") n++;
  if (f.entry !== "any") n++;
  if (f.operatingOnly) n++;
  if (f.collection !== "all") n++;
  return n;
}

export function countSecondaryActive(f: Filters) {
  let n = 0;
  if (f.current !== "any") n++;
  if (f.temp !== "any") n++;
  if (f.format !== "any") n++;
  if (f.entry !== "any") n++;
  if (f.operatingOnly) n++;
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

export function applyFilters(f: Filters, list: Destination[] = DESTINATIONS) {
  const q = f.query.trim().toLowerCase();
  const month = f.month === "any" ? null : Number(f.month);

  return list.filter((d) => {
    if (q && !`${d.name} ${d.region} ${d.country}`.toLowerCase().includes(q)) return false;

    if (f.collection !== "all") {
      const collection = getCollection(f.collection);
      if (collection && !collection.match(d)) return false;
    }

    if (f.where !== "all") {
      const [kind, value] = f.where.split(":");
      if (kind === "country" && d.country !== value) return false;
      if (kind === "continent" && continentOf(d.country) !== value) return false;
    }

    if (f.cert !== "any" && d.conditions.min_cert !== f.cert) return false;
    if (f.current !== "any" && d.conditions.current !== f.current) return false;
    if (f.temp !== "any" && !tempBand(d.conditions.water_temp_c).includes(f.temp)) return false;
    if (f.entry !== "any" && !d.conditions.entry.includes(f.entry)) return false;
    if (f.format !== "any" && !d.trip_formats.some((t) => t.format === f.format)) return false;

    if (f.species.length) {
      for (const name of f.species) {
        const sp = d.species.find((s) => s.name === name);
        if (!sp) return false;
        if (month !== null) {
          const status = sp.months[month];
          if (status !== "peak" && status !== "shoulder") return false;
        }
      }
    }

    if (month !== null) {
      if (d.operating_months[month] === "closed") return false;
      if (f.operatingOnly && d.operating_months[month] !== "open") return false;
      if (!f.species.length) {
        const s = d.best_months_overall[month];
        if (s !== "peak" && s !== "shoulder") return false;
      }
    }

    return true;
  });
}
