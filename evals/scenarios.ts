/**
 * Trip-fit scenario goldens. Written from the dataset's month strings and notes
 * BEFORE src/lib/fit.ts existed, then frozen. If a scenario fails, decide whether
 * the engine or the gold is wrong and record why in the commit — never edit a
 * scenario just to make it pass.
 *
 * Month indices are 0-based (0 = January). Target IDs are taxonomy group IDs
 * ("manta-rays") or canonical species IDs ("whale-shark").
 *
 * Journeys: J1 fixed window + goal · J2 destination first · J3 goal, flexible
 * dates · J4 experience-led.
 *
 * Changes after freezing:
 * - 2026-09-21: three Komodo expectations were updated when source verification
 *   corrected the Komodo access window (data/verification/corrections.json).
 *   The originals encoded the dataset's own error: that southern access is
 *   limited Dec–Feb.
 */
import type { Filters } from "@/lib/filters";

export type ViolationReason = "closed" | "operating" | "target" | "season" | "cert" | "current";

export type FitFlag =
  | "limited"
  | "shoulder"
  | "low_confidence"
  | "contested"
  | "snorkel_only"
  | "baited"
  | "required_cert"
  | "current_variable";

export type Scenario = {
  id: string;
  journey: "J1" | "J2" | "J3" | "J4" | "none";
  why: string;
  brief: Partial<Filters>;
  /** What a user of the old picker would have selected (exact common names). */
  baselineSpecies?: string[];
  mustInclude?: string[];
  mustExclude?: string[];
  nearMiss?: { id: string; reason: ViolationReason; fitsIn?: number[] }[];
  tiers?: Record<string, "good" | "caveats">;
  flags?: Record<string, FitFlag[]>;
  exactCount?: number;
  /** Scope-only briefs must behave exactly as the shipped product did. */
  sameAsBaseline?: boolean;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "mantas-september",
    journey: "J1",
    why: "The product's founding question. Needs group-level mantas; Socorro/Tubbataha are closed, Palau/Ari are off-season.",
    brief: { species: ["manta-rays"], month: "8" },
    baselineSpecies: ["Reef manta ray"],
    mustInclude: [
      "nusa-penida",
      "kona",
      "baa-atoll",
      "ningaloo",
      "komodo",
      "raja-ampat",
      "la-paz",
      "fakarava",
      "rangiroa",
    ],
    mustExclude: ["socorro", "tubbataha", "palau", "ari-atoll"],
    nearMiss: [
      { id: "socorro", reason: "closed", fitsIn: [10, 5] },
      { id: "tubbataha", reason: "closed", fitsIn: [3] },
      { id: "palau", reason: "target", fitsIn: [10] },
      { id: "ari-atoll", reason: "target", fitsIn: [0] },
    ],
    tiers: {
      "nusa-penida": "good",
      kona: "good",
      ningaloo: "good",
      rangiroa: "caveats",
      komodo: "good", // corrected data: central-park mantas peak Aug–Oct
      "raja-ampat": "caveats",
      "baa-atoll": "caveats",
    },
    flags: {
      rangiroa: ["low_confidence"],
      "raja-ampat": ["limited", "shoulder"],
      "baa-atoll": ["snorkel_only"],
    },
  },
  {
    id: "whale-sharks-any-month",
    journey: "J3",
    why: "Listed is not present: Raja Ampat is an explicit 'not here' record and Tubbataha is unpredictable all year.",
    brief: { species: ["whale-shark"] },
    baselineSpecies: ["Whale shark"],
    mustInclude: [
      "galapagos",
      "la-paz",
      "ari-atoll",
      "baa-atoll",
      "ningaloo",
      "socorro",
      "cabo-pulmo",
      "cocos",
    ],
    mustExclude: ["raja-ampat", "tubbataha"],
    nearMiss: [
      { id: "raja-ampat", reason: "target" },
      { id: "tubbataha", reason: "target" },
    ],
    tiers: { galapagos: "good", ningaloo: "caveats" },
    flags: {
      ningaloo: ["snorkel_only"],
      "baa-atoll": ["snorkel_only"],
      socorro: ["contested", "low_confidence"],
    },
  },
  {
    id: "whale-sharks-march",
    journey: "J1",
    why: "Only South Ari (peak) and Ningaloo (shoulder) work in March; Galápagos is a near miss that fits Jun–Oct.",
    brief: { species: ["whale-shark"], month: "2" },
    baselineSpecies: ["Whale shark"],
    mustInclude: ["ari-atoll", "ningaloo"],
    mustExclude: ["galapagos", "baa-atoll", "raja-ampat", "socorro", "la-paz"],
    nearMiss: [{ id: "galapagos", reason: "target", fitsIn: [7] }],
    tiers: { ningaloo: "caveats" },
  },
  {
    id: "advanced-cert",
    journey: "J4",
    why: "An Advanced diver can dive every Open Water destination too. The shipped filter showed 12, not 30.",
    brief: { cert: "advanced" },
    exactCount: 30,
    mustInclude: ["tulamben", "komodo", "malta"],
    mustExclude: ["cocos", "socorro", "galapagos"],
    nearMiss: [{ id: "cocos", reason: "cert" }],
  },
  {
    id: "advanced-plus-experience-cert",
    journey: "J4",
    why: "The top of the ladder qualifies for everything.",
    brief: { cert: "advanced_plus_experience" },
    exactCount: 36,
  },
  {
    id: "open-water-mild-march",
    journey: "J4",
    why: "Newer diver, low current tolerance. Malta is a near miss only because March is off-season there.",
    brief: { cert: "open_water", current: "mild", month: "2" },
    mustInclude: ["tulamben", "silfra"],
    mustExclude: ["komodo", "malta", "cabo-pulmo"],
    nearMiss: [{ id: "malta", reason: "season", fitsIn: [5] }],
    flags: { silfra: ["required_cert"], tulamben: ["shoulder"] },
  },
  {
    id: "komodo-mantas-january-advanced",
    journey: "J2",
    why: "Corrected data: January is Manta Alley season and the south is at its best, so this is a clean fit. The catch moves to trip format (land-based boats work the north/central park).",
    brief: { species: ["manta-rays"], month: "0", cert: "advanced" },
    baselineSpecies: ["Reef manta ray"],
    mustInclude: ["komodo"],
    tiers: { komodo: "good" },
  },
  {
    id: "komodo-january-open-water",
    journey: "J2",
    why: "Advanced is the practical floor at Komodo; an Open Water diver should see it as a near miss, not a fit.",
    brief: { month: "0", cert: "open_water", query: "komodo" },
    mustExclude: ["komodo"],
    nearMiss: [{ id: "komodo", reason: "cert" }],
  },
  {
    id: "whitetips-philippines-july",
    journey: "J1",
    why: "Tubbataha has the densest whitetips anywhere but is closed in July; Malapascua works with limited access.",
    brief: { where: "country:Philippines", species: ["whitetip-reef-shark"], month: "6" },
    baselineSpecies: ["Whitetip reef shark"],
    mustInclude: ["malapascua"],
    mustExclude: ["tubbataha"],
    nearMiss: [{ id: "tubbataha", reason: "closed", fitsIn: [3] }],
    flags: { malapascua: ["limited"] },
  },
  {
    id: "bull-sharks-cabo-pulmo",
    journey: "J3",
    why: "Sources contradict on the bull shark window; the engine must say so, not hide it in a flat encoding.",
    brief: { species: ["bull-shark"], query: "cabo pulmo" },
    baselineSpecies: ["Bull shark"],
    mustInclude: ["cabo-pulmo"],
    tiers: { "cabo-pulmo": "caveats" },
    flags: { "cabo-pulmo": ["contested", "low_confidence", "shoulder"] },
  },
  {
    id: "thresher-sharks",
    journey: "J3",
    why: "Group spans 'Pelagic thresher shark' and genus-level 'Thresher shark'. Moalboal and the Brothers are unreliable.",
    brief: { species: ["thresher-sharks"] },
    baselineSpecies: ["Pelagic thresher shark"],
    mustInclude: ["malapascua", "alor"],
    mustExclude: ["moalboal", "red-sea-brothers"],
    nearMiss: [
      { id: "moalboal", reason: "target" },
      { id: "red-sea-brothers", reason: "target" },
    ],
    tiers: { malapascua: "good" },
  },
  {
    id: "hammerheads-july-moderate-current",
    journey: "J1",
    why: "Every July hammerhead site is strong-current. Zero fits, but the near misses tell the diver exactly why.",
    brief: { species: ["hammerheads"], month: "6", current: "moderate" },
    baselineSpecies: ["Scalloped hammerhead"],
    exactCount: 0,
    mustExclude: ["cocos", "galapagos", "red-sea-brothers"],
    nearMiss: [{ id: "cocos", reason: "current" }],
  },
  {
    id: "mola-august-advanced",
    journey: "J1",
    why: "Nusa Penida is the mola bet in August; Alor's season starts in September; Galápagos needs more experience.",
    brief: { species: ["ocean-sunfish"], month: "7", cert: "advanced" },
    baselineSpecies: ["Ocean sunfish"],
    mustInclude: ["nusa-penida", "tulamben"],
    mustExclude: ["alor", "galapagos"],
    nearMiss: [
      { id: "alor", reason: "target", fitsIn: [9] },
      { id: "galapagos", reason: "cert" },
    ],
    tiers: { "nusa-penida": "good", tulamben: "caveats" },
  },
  {
    id: "mantas-open-water",
    journey: "J4",
    why: "Mantas for a new diver: exclude Advanced-floor sites, keep OW ones.",
    brief: { species: ["manta-rays"], cert: "open_water" },
    baselineSpecies: ["Reef manta ray"],
    mustInclude: ["baa-atoll", "ningaloo"],
    mustExclude: ["komodo", "nusa-penida", "socorro"],
    nearMiss: [{ id: "komodo", reason: "cert" }],
  },
  {
    id: "fully-operating-january",
    journey: "J1",
    why: "'Fully operating' must drop limited-access months.",
    brief: { month: "0", operatingOnly: true },
    mustExclude: ["alor", "nusa-penida", "baa-atoll"], // was komodo until its access window was corrected
  },
  {
    id: "hanifaru-august",
    journey: "J1",
    why: "Baa's famous manta aggregation is snorkel-only; a scuba diver must be told.",
    brief: { species: ["reef-manta-ray"], month: "7", query: "baa" },
    baselineSpecies: ["Reef manta ray"],
    mustInclude: ["baa-atoll"],
    flags: { "baa-atoll": ["snorkel_only"] },
  },
  {
    id: "no-brief-europe",
    journey: "none",
    why: "Scope-only filters must not change behaviour or order.",
    brief: { where: "continent:Europe" },
    sameAsBaseline: true,
    mustInclude: ["malta", "silfra", "azores"],
  },
  {
    id: "no-brief-wreck",
    journey: "none",
    why: "Scope-only filters must not change behaviour or order.",
    brief: { diveType: "wreck" },
    sameAsBaseline: true,
  },
  {
    id: "no-brief-empty",
    journey: "none",
    why: "The default homepage is untouched.",
    brief: {},
    sameAsBaseline: true,
    exactCount: 36,
  },
  {
    id: "green-turtle-merge",
    journey: "J3",
    why: "'Green turtle' and 'Green sea turtle' are the same animal (Chelonia mydas). Kona and O'ahu were invisible to the old filter.",
    brief: { species: ["green-turtle"] },
    baselineSpecies: ["Green turtle"],
    exactCount: 9,
    mustInclude: [
      "komodo",
      "tubbataha",
      "moalboal",
      "cozumel",
      "palau",
      "ningaloo",
      "gbr-ribbon-reefs",
      "kona",
      "oahu",
    ],
  },
  {
    id: "sea-turtles-group",
    journey: "J3",
    why: "Group target covers green and hawksbill turtles.",
    brief: { species: ["sea-turtles"] },
    baselineSpecies: ["Green turtle"],
    mustInclude: ["kona", "oahu", "nusa-penida"],
  },
  {
    id: "tiger-sharks-baited",
    journey: "J3",
    why: "Tiger Beach encounters are baited — the fact that decides whether it's for you.",
    brief: { species: ["tiger-shark"] },
    baselineSpecies: ["Tiger shark"],
    mustInclude: ["tiger-beach"],
    flags: { "tiger-beach": ["baited"] },
  },
  {
    id: "tubbataha-variable-current",
    journey: "J4",
    why: "'Variable' current is not a hard fail for a moderate-current diver, but it must be flagged.",
    brief: { current: "moderate", query: "tubbataha" },
    mustInclude: ["tubbataha"],
    flags: { tubbataha: ["current_variable"] },
  },
  {
    id: "blue-sharks-august",
    journey: "J1",
    why: "Azores blue sharks peak in August and are chummed.",
    brief: { species: ["blue-shark"], month: "7" },
    baselineSpecies: ["Blue shark"],
    mustInclude: ["azores"],
    flags: { azores: ["baited"] },
  },
  {
    id: "blue-sharks-january",
    journey: "J1",
    why: "Azores is closed AND the sharks are absent: two broken constraints is not a near miss.",
    brief: { species: ["blue-shark"], month: "0" },
    baselineSpecies: ["Blue shark"],
    exactCount: 0,
    mustExclude: ["azores"],
  },
  {
    id: "mantas-and-whale-sharks-may",
    journey: "J1",
    why: "Multiple targets are AND: both animals in the same month.",
    brief: { species: ["manta-rays", "whale-shark"], month: "4" },
    baselineSpecies: ["Reef manta ray", "Whale shark"],
    mustInclude: ["baa-atoll", "ningaloo", "ari-atoll"],
    mustExclude: ["raja-ampat", "kona", "nusa-penida"],
  },
  {
    id: "komodo-july-limited",
    journey: "J2",
    why: "Corrected data: Jun–Aug is when southern Komodo is rough and hard to reach.",
    brief: { month: "6", query: "komodo" },
    mustInclude: ["komodo"],
    flags: { komodo: ["limited"] },
  },
  {
    id: "galapagos-hammerheads-discovered-conflict",
    journey: "J3",
    why: "Source review found an undeclared conflict: one cited source puts hammerhead schools in the warm season, another in the cool season. Added 2026-09-21 with the verification layer.",
    // Unaccented on purpose: this scenario exposed that search was accent-sensitive.
    brief: { species: ["hammerheads"], query: "galapagos" },
    mustInclude: ["galapagos"],
    flags: { galapagos: ["contested"] },
  },
  {
    id: "july-no-target",
    journey: "J1",
    why: "Month without a target uses overall season; closed places drop out.",
    brief: { month: "6" },
    mustInclude: ["komodo"],
    mustExclude: ["tubbataha", "socorro"],
  },
];
