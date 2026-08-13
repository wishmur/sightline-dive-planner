import type { Destination } from "@/lib/destinations";

import heroOcean from "@/assets/hero-ocean.jpg";
import sceneBigAnimals from "@/assets/scene-big-animals.jpg";
import sceneReef from "@/assets/scene-reef.jpg";
import sceneWall from "@/assets/scene-wall.jpg";
import sceneMacro from "@/assets/scene-macro.jpg";
import sceneAdventure from "@/assets/scene-adventure.jpg";
import sceneCold from "@/assets/scene-cold.jpg";

export const HERO_IMAGE = heroOcean;

export const SCENES = {
  bigAnimals: sceneBigAnimals,
  reef: sceneReef,
  wall: sceneWall,
  macro: sceneMacro,
  adventure: sceneAdventure,
  cold: sceneCold,
} as const;

export type SceneKey = keyof typeof SCENES;

const TYPE_SCENE: Record<string, SceneKey> = {
  pelagic: "bigAnimals",
  shark: "bigAnimals",
  cetacean: "bigAnimals",
  macro: "macro",
  muck: "macro",
  blackwater: "macro",
  wall: "wall",
  cave: "wall",
  cenote: "wall",
  wreck: "wall",
  formation: "reef",
  reef: "reef",
  night: "macro",
  drift: "adventure",
  freshwater: "cold",
  cold_water: "cold",
};

/** Deterministic editorial scene per destination, derived from its own data. */
export function sceneKeyFor(d: Destination): SceneKey {
  if ((d.conditions.water_temp_c[0] ?? 25) < 16) return "cold";
  if (d.conditions.current === "strong" && d.highlights.some((h) => h.type === "drift")) {
    return "adventure";
  }
  for (const h of [...d.highlights].sort((a, b) => a.rank - b.rank)) {
    const scene = TYPE_SCENE[h.type];
    if (scene) return scene;
  }
  return "reef";
}

export function destinationImage(d: Destination) {
  return SCENES[sceneKeyFor(d)];
}

export function destinationImageAlt(d: Destination) {
  return `Underwater scene representing diving at ${d.name}, ${d.country}`;
}
