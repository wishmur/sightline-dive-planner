import raw from "@/data/destinations.json";
import { canonicalName, canonicalSpeciesId, legacySlug, slugify } from "@/lib/taxonomy";

export type MonthState = "peak" | "shoulder" | "off" | "absent";
export type OperatingState = "open" | "limited" | "closed";
export type Confidence = "high" | "medium" | "low";

export type Highlight = {
  rank: number;
  type: string;
  label: string;
  note: string;
  seasonality: string | null;
  confidence: Confidence;
  sources: string[];
};

export type SpeciesEntry = {
  name: string;
  scientific: string;
  months: MonthState[];
  reliability: string;
  encounter_type: string;
  note: string;
  confidence: Confidence;
  sources: string[];
};

export type TripFormat = {
  format: string;
  orientation: string;
  typical_duration: string;
  note: string;
};

export type Conditions = {
  current: string;
  viz_range_m: number[];
  water_temp_c: number[];
  thermoclines: boolean;
  entry: string[];
  min_cert: string;
  required_certs: { cert: string; requirement: string; note: string }[];
  experience_note: string;
  confidence: Confidence;
  sources: string[];
};

export type Destination = {
  id: string;
  name: string;
  region: string;
  country: string;
  coordinates: { lat: number; lng: number };
  summary: string;
  highlights: Highlight[];
  species: SpeciesEntry[];
  trip_formats: TripFormat[];
  conditions: Conditions;
  best_months_overall: MonthState[];
  operating_months: OperatingState[];
  operating_note: string;
  operating_confidence: Confidence;
  operating_sources: string[];
  last_verified: string;
  sources: string[];
};

// Imported at build time — never fetched at runtime.
export const DESTINATIONS = raw as unknown as Destination[];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function getDestination(id: string) {
  return DESTINATIONS.find((d) => d.id === id);
}

/** Slug of a listing's own name (used for claim IDs). */
export function speciesSlug(name: string) {
  return slugify(name);
}

export type SpeciesGroup = {
  /** Canonical species ID — also the /species/$slug URL. */
  slug: string;
  name: string;
  scientific: string;
  matches: { destination: Destination; species: SpeciesEntry }[];
};

const SLUG_ALIASES = new Map<string, string>();

/** One entry per canonical species: "Green turtle" and "Green sea turtle" are one animal. */
export const SPECIES_GROUPS: SpeciesGroup[] = (() => {
  const map = new Map<string, SpeciesGroup>();
  for (const destination of DESTINATIONS) {
    for (const species of destination.species) {
      const slug = canonicalSpeciesId(species);
      let group = map.get(slug);
      if (!group) {
        group = { slug, name: canonicalName(species), scientific: species.scientific, matches: [] };
        map.set(slug, group);
      }
      group.matches.push({ destination, species });
      for (const alias of [slugify(species.name), legacySlug(species.name)]) {
        if (alias !== slug) SLUG_ALIASES.set(alias, slug);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

export function getSpeciesGroup(slug: string) {
  const id = SLUG_ALIASES.get(slug) ?? slug;
  return SPECIES_GROUPS.find((g) => g.slug === id);
}

export function formatFormat(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

const MONTH_ABBR = MONTHS.map((m) => m.slice(0, 3));

/** "Best Aug–Oct" / "Peak year-round" from the destination's overall month states. */
export function bestMonthsLabel(months: MonthState[]): string | null {
  const peaks = months.map((m, i) => (m === "peak" ? i : -1)).filter((i) => i >= 0);
  if (peaks.length === 0) return null;
  if (peaks.length === 12) return "Peak year-round";

  // longest circular run of peak months
  let best = { start: peaks[0]!, len: 1 };
  for (const start of peaks) {
    let len = 1;
    while (len < 12 && months[(start + len) % 12] === "peak") len++;
    if (len > best.len) best = { start, len };
  }
  const end = (best.start + best.len - 1) % 12;
  return best.len === 1
    ? `Best in ${MONTH_ABBR[best.start]}`
    : `Best ${MONTH_ABBR[best.start]}–${MONTH_ABBR[end]}`;
}

/** Species present at peak in every month, phrased for a card chip. */
export function yearRoundSpecies(destination: Destination): string | null {
  const s = destination.species.find((sp) => sp.months.every((m) => m === "peak"));
  return s ? `${s.name} year-round` : null;
}
