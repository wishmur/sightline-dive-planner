import type { Destination } from "@/lib/destinations";
import type { Filters } from "@/lib/filters";
import { canonicalSpeciesId } from "@/lib/taxonomy";

/** Highlight type -> human label. Drives both card tags and the Dive type filter. */
export const TYPE_TAG: Record<string, string> = {
  pelagic: "Pelagics",
  shark: "Sharks",
  cetacean: "Whales",
  reef: "Reef",
  wall: "Walls",
  wreck: "Wreck",
  drift: "Drift",
  macro: "Macro",
  muck: "Muck",
  cave: "Caves",
  cenote: "Cenotes",
  blackwater: "Blackwater",
  formation: "Formations",
  night: "Night dives",
  freshwater: "Freshwater",
  cold_water: "Cold water",
};

export function diveTypeLabel(type: string) {
  return TYPE_TAG[type] ?? type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** A card tag plus the filter dimension it maps onto. */
export type DestinationTag = { label: string; patch: Partial<Filters> };

const HEADLINE_SPECIES =
  /manta|whale shark|hammerhead|mola|sunfish|humpback|thresher|tiger shark|bull shark|great hammerhead|sea lion|orca|mobula|dugong/i;

const CURRENT_TAG: Record<string, string | null> = {
  strong: "Strong current",
  variable: "Variable current",
  moderate: null,
  mild: null,
  none: null,
};

/** 2–4 scannable tags per destination, each mapped to a filter dimension. */
export function destinationTagChips(d: Destination): DestinationTag[] {
  const tags: DestinationTag[] = [];
  const has = (label: string) => tags.some((t) => t.label === label);

  for (const s of d.species) {
    if (tags.length >= 2) break;
    const reliable = s.reliability === "resident" || s.reliability === "seasonal";
    if (reliable && HEADLINE_SPECIES.test(s.name))
      tags.push({ label: s.name, patch: { species: [canonicalSpeciesId(s)] } });
  }

  for (const h of [...d.highlights].sort((a, b) => a.rank - b.rank)) {
    if (tags.length >= 3) break;
    const tag = TYPE_TAG[h.type];
    if (tag && !has(tag)) tags.push({ label: tag, patch: { diveType: h.type } });
  }

  const current = CURRENT_TAG[d.conditions.current];
  if (current && tags.length < 4)
    tags.push({ label: current, patch: { current: d.conditions.current } });

  if (tags.length < 4 && d.trip_formats.some((t) => t.format === "liveaboard")) {
    tags.push({ label: "Liveaboard", patch: { format: "liveaboard" } });
  }

  return tags.slice(0, 4);
}

/** Label-only variant for read-only contexts. */
export function destinationTags(d: Destination): string[] {
  return destinationTagChips(d).map((t) => t.label);
}

export const CERT_LABEL: Record<string, string> = {
  open_water: "Open Water",
  advanced: "Advanced",
  advanced_plus_experience: "Advanced + experience",
};

export function certLabel(value: string) {
  return CERT_LABEL[value] ?? value.replace(/_/g, " ");
}
