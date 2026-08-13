import raw from "@/data/destinations.json";

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

export function speciesSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export type SpeciesGroup = {
  slug: string;
  name: string;
  scientific: string;
  matches: { destination: Destination; species: SpeciesEntry }[];
};

export const SPECIES_GROUPS: SpeciesGroup[] = (() => {
  const map = new Map<string, SpeciesGroup>();
  for (const destination of DESTINATIONS) {
    for (const species of destination.species) {
      const slug = speciesSlug(species.name);
      let group = map.get(slug);
      if (!group) {
        group = { slug, name: species.name, scientific: species.scientific, matches: [] };
        map.set(slug, group);
      }
      group.matches.push({ destination, species });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

export function getSpeciesGroup(slug: string) {
  return SPECIES_GROUPS.find((g) => g.slug === slug);
}

export type SearchResult =
  | { kind: "species"; slug: string; label: string; sub: string }
  | { kind: "destination"; slug: string; label: string; sub: string };

export function search(query: string, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];

  for (const g of SPECIES_GROUPS) {
    if (g.name.toLowerCase().includes(q) || g.scientific.toLowerCase().includes(q)) {
      results.push({
        kind: "species",
        slug: g.slug,
        label: g.name,
        sub: `${g.matches.length} destination${g.matches.length === 1 ? "" : "s"}`,
      });
    }
  }
  for (const d of DESTINATIONS) {
    if (
      d.name.toLowerCase().includes(q) ||
      d.region.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q)
    ) {
      results.push({
        kind: "destination",
        slug: d.id,
        label: d.name,
        sub: `${d.region}, ${d.country}`,
      });
    }
  }
  return results.slice(0, limit);
}

export function formatFormat(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export type FinderMatch = {
  destination: Destination;
  status: Extract<MonthState, "peak" | "shoulder">;
};

/** Destinations where the species is peak/shoulder in the given month and diving is not closed. */
export function findDestinations(slug: string, monthIndex: number): FinderMatch[] {
  const group = getSpeciesGroup(slug);
  if (!group) return [];
  const matches: FinderMatch[] = [];
  for (const { destination, species } of group.matches) {
    const status = species.months[monthIndex];
    if (status !== "peak" && status !== "shoulder") continue;
    if (destination.operating_months[monthIndex] === "closed") continue;
    matches.push({ destination, status });
  }
  return matches.sort((a, b) => {
    if (a.status !== b.status) return a.status === "peak" ? -1 : 1;
    return a.destination.name.localeCompare(b.destination.name);
  });
}