import type { Destination } from "@/lib/destinations";

const TYPE_TAG: Record<string, string> = {
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

const HEADLINE_SPECIES =
  /manta|whale shark|hammerhead|mola|sunfish|humpback|thresher|tiger shark|bull shark|great hammerhead|sea lion|orca|mobula|dugong/i;

const CURRENT_TAG: Record<string, string | null> = {
  strong: "Strong current",
  variable: "Variable current",
  moderate: null,
  mild: null,
  none: null,
};

/** 2–4 scannable tags per destination, surfacing what is distinctive about it. */
export function destinationTags(d: Destination): string[] {
  const tags: string[] = [];

  for (const s of d.species) {
    if (tags.length >= 2) break;
    const reliable = s.reliability === "resident" || s.reliability === "seasonal";
    if (reliable && HEADLINE_SPECIES.test(s.name)) tags.push(s.name);
  }

  for (const h of [...d.highlights].sort((a, b) => a.rank - b.rank)) {
    if (tags.length >= 3) break;
    const tag = TYPE_TAG[h.type];
    if (tag && !tags.includes(tag)) tags.push(tag);
  }

  const current = CURRENT_TAG[d.conditions.current];
  if (current && tags.length < 4) tags.push(current);

  if (tags.length < 4 && d.trip_formats.some((t) => t.format === "liveaboard")) {
    tags.push("Liveaboard");
  }

  return tags.slice(0, 4);
}

export const CERT_LABEL: Record<string, string> = {
  open_water: "Open Water",
  advanced: "Advanced",
  advanced_plus_experience: "Advanced + experience",
};

export function certLabel(value: string) {
  return CERT_LABEL[value] ?? value.replace(/_/g, " ");
}
