import { DESTINATIONS, type Destination } from "@/lib/destinations";

import heroOcean from "@/assets/hero-ocean.jpg";
import sceneBigAnimals from "@/assets/scene-big-animals.jpg";
import sceneReef from "@/assets/scene-reef.jpg";
import sceneWall from "@/assets/scene-wall.jpg";
import sceneMacro from "@/assets/scene-macro.jpg";
import sceneAdventure from "@/assets/scene-adventure.jpg";
import sceneCold from "@/assets/scene-cold.jpg";
import sceneHammerhead from "@/assets/scene-hammerhead.jpg";
import sceneWhaleshark from "@/assets/scene-whaleshark.jpg";
import sceneManta from "@/assets/scene-manta.jpg";
import sceneWreck from "@/assets/scene-wreck.jpg";
import sceneCavern from "@/assets/scene-cavern.jpg";
import sceneKelp from "@/assets/scene-kelp.jpg";
import sceneMuck from "@/assets/scene-muck.jpg";
import sceneBaitball from "@/assets/scene-baitball.jpg";
import sceneSealion from "@/assets/scene-sealion.jpg";
import sceneCurrent from "@/assets/scene-current.jpg";
import sceneCoral from "@/assets/scene-coral.jpg";
import sceneWhale from "@/assets/scene-whale.jpg";
import sceneThresher from "@/assets/scene-thresher.jpg";
import sceneMola from "@/assets/scene-mola.jpg";

export const HERO_IMAGE = heroOcean;

export const SCENES = {
  bigAnimals: sceneBigAnimals,
  reef: sceneReef,
  wall: sceneWall,
  macro: sceneMacro,
  adventure: sceneAdventure,
  cold: sceneCold,
  hammerhead: sceneHammerhead,
  whaleshark: sceneWhaleshark,
  manta: sceneManta,
  wreck: sceneWreck,
  cavern: sceneCavern,
  kelp: sceneKelp,
  muck: sceneMuck,
  baitball: sceneBaitball,
  sealion: sceneSealion,
  current: sceneCurrent,
  coral: sceneCoral,
  whale: sceneWhale,
  thresher: sceneThresher,
  mola: sceneMola,
} as const;

export type SceneKey = keyof typeof SCENES;

/** Highlight type -> candidate scenes, most specific first. */
const TYPE_SCENES: Record<string, SceneKey[]> = {
  pelagic: ["baitball", "bigAnimals", "whaleshark"],
  shark: ["hammerhead", "bigAnimals"],
  cetacean: ["whale", "bigAnimals"],
  macro: ["macro", "muck"],
  muck: ["muck", "macro"],
  blackwater: ["muck", "macro"],
  night: ["macro", "muck"],
  wall: ["wall", "coral"],
  cave: ["cavern", "wall"],
  cenote: ["cavern", "wall"],
  wreck: ["wreck", "wall"],
  formation: ["coral", "reef"],
  reef: ["coral", "reef"],
  drift: ["current", "adventure"],
  freshwater: ["cavern", "kelp"],
  cold_water: ["kelp", "cold"],
};

const SPECIES_SCENES: [RegExp, SceneKey][] = [
  [/manta|mobula/i, "manta"],
  [/whale shark/i, "whaleshark"],
  [/hammerhead|thresher|tiger shark|bull shark|grey reef shark|silky/i, "hammerhead"],
  [/humpback|orca|pilot whale|sperm whale|dolphin/i, "whale"],
  [/sea lion|seal|otter/i, "sealion"],
  [/sardine|jack|trevally|barracuda|snapper|bait/i, "baitball"],
  [/frogfish|nudibranch|octopus|seahorse|pipefish|cuttlefish|rhinopias|shrimp/i, "muck"],
];

/** Candidate scenes for a destination, best fit first. */
function candidates(d: Destination): SceneKey[] {
  const out: SceneKey[] = [];
  const push = (k: SceneKey) => {
    if (!out.includes(k)) out.push(k);
  };

  if ((d.conditions.water_temp_c[0] ?? 25) < 16) {
    push("kelp");
    push("cold");
  }

  const ranked = [...d.highlights].sort((a, b) => a.rank - b.rank);
  for (const h of ranked.slice(0, 2)) {
    for (const s of TYPE_SCENES[h.type] ?? []) push(s);
  }

  for (const sp of d.species) {
    if (sp.reliability !== "resident" && sp.reliability !== "seasonal") continue;
    for (const [re, scene] of SPECIES_SCENES) if (re.test(sp.name)) push(scene);
  }

  for (const h of ranked.slice(2)) {
    for (const s of TYPE_SCENES[h.type] ?? []) push(s);
  }

  if (d.conditions.current === "strong") push("current");
  if (d.trip_formats.some((t) => t.format === "liveaboard" || t.format === "expedition")) {
    push("adventure");
  }
  push("reef");
  push("coral");
  return out;
}

/**
 * Deterministic scene assignment that spreads the library across destinations,
 * so unrelated places do not share the same photograph.
 */
const ASSIGNED: Record<string, SceneKey> = (() => {
  const uses: Partial<Record<SceneKey, number>> = {};
  const map: Record<string, SceneKey> = {};
  for (const d of DESTINATIONS) {
    const options = candidates(d);
    let best = options[0]!;
    let bestUse = uses[best] ?? 0;
    for (const option of options) {
      const use = uses[option] ?? 0;
      if (use < bestUse) {
        best = option;
        bestUse = use;
      }
      if (bestUse === 0) break;
    }
    uses[best] = (uses[best] ?? 0) + 1;
    map[d.id] = best;
  }
  return map;
})();

export function sceneKeyFor(d: Destination): SceneKey {
  return ASSIGNED[d.id] ?? "reef";
}

export function destinationImage(d: Destination) {
  return SCENES[sceneKeyFor(d)];
}

export function destinationImageAlt(d: Destination) {
  return `Underwater scene representing diving at ${d.name}, ${d.country}`;
}

/** Highlight type -> a scene photo, reusing the existing library. */
const HIGHLIGHT_SCENES: Record<string, SceneKey> = {
  pelagic: "whaleshark",
  shark: "hammerhead",
  cetacean: "whale",
  manta: "manta",
  reef: "reef",
  wall: "wall",
  formation: "coral",
  coral: "coral",
  macro: "macro",
  muck: "muck",
  blackwater: "muck",
  night: "macro",
  wreck: "wreck",
  drift: "current",
  current: "current",
  cave: "cavern",
  cavern: "cavern",
  cenote: "cavern",
  freshwater: "cavern",
  kelp: "kelp",
  cold_water: "cold",
  cold: "cold",
  expedition: "adventure",
  remote: "adventure",
  adventure: "adventure",
  pinnacle: "wall",
  baitball: "baitball",
  seal: "sealion",
  pinniped: "sealion",
};

export function highlightImage(type: string, d: Destination) {
  const key = HIGHLIGHT_SCENES[type?.toLowerCase?.() ?? ""];
  return key ? SCENES[key] : destinationImage(d);
}

/**
 * Subject-first matching: the highlight's own title decides the photograph,
 * falling back to the broad type only when nothing specific is named.
 */
const SUBJECT_SCENES: [RegExp, SceneKey][] = [
  [/thresher/i, "thresher"],
  [/mola|sunfish/i, "mola"],
  [/manta|mobula|devil ray/i, "manta"],
  [/whale shark/i, "whaleshark"],
  [/hammerhead/i, "hammerhead"],
  [/humpback|minke|dolphin|orca|cetacean|pilot whale|sperm whale/i, "whale"],
  [/sea lion|seal|pinniped|otter/i, "sealion"],
  [/sardine|baitball|bait ball|jack|trevally|barracuda|schooling fish|potato cod|grouper/i, "baitball"],
  [/shark/i, "bigAnimals"],
  [/wreck|liberty|thistlegorm|corsair|navy pier|numidia|aida|salvatierra|fang ming|c-59/i, "wreck"],
  [/cenote|cavern|cave|tunnel|swim-through|blue hole|fissure|rift|monument/i, "cavern"],
  [/muck|black sand|volcanic sand|blackwater/i, "muck"],
  [/frogfish|nudibranch|critter|octopus|seahorse|pipefish|cuttlefish|rhinopias|shrimp|macro|cryptic|toadfish/i, "macro"],
  [/kelp/i, "kelp"],
  [/glacial|meltwater|freshwater|halocline/i, "cavern"],
  [/current|drift|pass\b|channel|kuroshio|corner/i, "current"],
  [/wall|pinnacle|drop-off/i, "wall"],
  [/coral|reef|biodiversity|atoll|lagoon|thila/i, "coral"],
];

export function highlightSubjectImage(
  h: { label?: string; type: string },
  d: Destination,
) {
  const label = h.label ?? "";
  for (const [re, scene] of SUBJECT_SCENES) if (re.test(label)) return SCENES[scene];
  return highlightImage(h.type, d);
}
