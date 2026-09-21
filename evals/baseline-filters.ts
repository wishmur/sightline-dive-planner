/**
 * Frozen copy of `applyFilters` as it shipped before the trip-fit engine
 * (src/lib/filters.ts at commit 6025558). Used only by the eval report to
 * compare old and new behaviour on the same scenarios. Do not "fix" this file.
 */
import { DESTINATIONS, type Destination } from "@/lib/destinations";
import { getCollection } from "@/lib/collections";
import { continentOf } from "@/lib/filters";

export type BaselineFilters = {
  query: string;
  where: string;
  month: string;
  species: string[]; // exact common names, as the old picker offered them
  diveType: string;
  cert: string;
  current: string;
  temp: string;
  format: string;
  entry: string;
  operatingOnly: boolean;
  collection: string;
};

export const BASELINE_EMPTY: BaselineFilters = {
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

function tempBand(range: number[]): string[] {
  const [lo = 0, hi = 0] = range;
  const bands: string[] = [];
  if (hi >= 26) bands.push("warm");
  if (hi >= 18 && lo <= 25) bands.push("temperate");
  if (lo < 18) bands.push("cold");
  return bands;
}

export function baselineApplyFilters(f: BaselineFilters, list: Destination[] = DESTINATIONS) {
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
    if (f.diveType !== "any" && !d.highlights.some((h) => h.type === f.diveType)) return false;
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
