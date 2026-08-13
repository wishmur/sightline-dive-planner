import { DESTINATIONS, type Destination } from "@/lib/destinations";
import { SCENES } from "@/lib/imagery";

export type Collection = {
  id: string;
  title: string;
  items: string[];
  image: string;
  /** Existing project scenes this category can gently crossfade between. */
  images: string[];
  match: (d: Destination) => boolean;
};

const BIG = /manta|shark|whale|mola|sunfish|dolphin|mobula|hammerhead|orca|seal|sea lion/i;
const SMALL =
  /frogfish|octopus|nudibranch|seahorse|cuttlefish|pipefish|mandarin|wonderpus|rhinopias|scorpionfish|bobbit|shrimp|crab|blenny|goby/i;

function hasType(d: Destination, types: string[]) {
  return d.highlights.some((h) => types.includes(h.type));
}

function hasSpecies(d: Destination, re: RegExp) {
  return d.species.some((s) => re.test(s.name));
}

export const COLLECTIONS: Collection[] = [
  {
    id: "big-animals",
    title: "Big animals",
    items: ["Mantas", "Sharks", "Whales", "Mola"],
    image: SCENES.bigAnimals,
    images: [SCENES.manta, SCENES.whaleshark, SCENES.hammerhead],
    match: (d) => hasType(d, ["pelagic", "shark", "cetacean"]) || hasSpecies(d, BIG),
  },
  {
    id: "reefs",
    title: "Reefs & color",
    items: ["Coral", "Walls", "Tropical reefs"],
    image: SCENES.reef,
    images: [SCENES.coral, SCENES.reef, SCENES.wall],
    match: (d) =>
      hasType(d, ["reef", "wall", "formation"]) && (d.conditions.water_temp_c[0] ?? 0) >= 22,
  },
  {
    id: "macro",
    title: "Macro & weird stuff",
    items: ["Frogfish", "Octopus", "Nudibranchs"],
    image: SCENES.macro,
    images: [SCENES.macro, SCENES.muck],
    match: (d) => hasType(d, ["macro", "muck", "blackwater", "night"]) || hasSpecies(d, SMALL),
  },
  {
    id: "adventure",
    title: "Adventure diving",
    items: ["Current", "Remote", "Liveaboards"],
    image: SCENES.adventure,
    images: [SCENES.current, SCENES.adventure, SCENES.wreck],
    match: (d) =>
      d.conditions.current === "strong" ||
      hasType(d, ["drift"]) ||
      d.trip_formats.some((t) => t.format === "liveaboard" || t.format === "expedition"),
  },
];

export function getCollection(id: string) {
  return COLLECTIONS.find((c) => c.id === id);
}

export const COLLECTION_COUNTS: Record<string, number> = Object.fromEntries(
  COLLECTIONS.map((c) => [c.id, DESTINATIONS.filter(c.match).length]),
);
