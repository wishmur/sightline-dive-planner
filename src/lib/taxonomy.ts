/**
 * Species taxonomy for search. Pure (no data imports) so destinations.ts can use it.
 *
 * - Canonical species: listings that are the same animal share one ID. Keyed by
 *   preferred common name, with scientific-name overrides where the dataset uses
 *   two names for one species (Chelonia mydas, Carcharhinus galapagensis).
 * - Groups: how divers actually ask ("mantas", "hammerheads"). A group target is
 *   satisfied by any member species.
 * - Aliases: words used to link a target to highlights and trip-format notes.
 */

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The slug the site used before diacritics were normalised ("gal-pagos-shark"). */
export function legacySlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const PREFERRED_NAME_BY_SCIENTIFIC: Record<string, string> = {
  "Chelonia mydas": "Green turtle",
  "Carcharhinus galapagensis": "Galápagos shark",
};

export function canonicalName(listing: { name: string; scientific: string }) {
  return PREFERRED_NAME_BY_SCIENTIFIC[listing.scientific] ?? listing.name;
}

export function canonicalSpeciesId(listing: { name: string; scientific: string }) {
  return slugify(canonicalName(listing));
}

export type SpeciesGroupDef = { id: string; label: string; members: string[] };

export const GROUP_DEFS: SpeciesGroupDef[] = [
  { id: "manta-rays", label: "Manta rays", members: ["reef-manta-ray", "giant-oceanic-manta-ray"] },
  {
    id: "hammerheads",
    label: "Hammerhead sharks",
    members: ["scalloped-hammerhead", "great-hammerhead", "hammerhead-shark-unresolved-species"],
  },
  {
    id: "thresher-sharks",
    label: "Thresher sharks",
    members: ["pelagic-thresher-shark", "thresher-shark"],
  },
  { id: "sea-turtles", label: "Sea turtles", members: ["green-turtle", "hawksbill-turtle"] },
  {
    id: "devil-rays",
    label: "Devil & mobula rays",
    members: ["mobula-ray", "sicklefin-devil-ray", "spinetail-devil-ray"],
  },
  { id: "sea-lions", label: "Sea lions", members: ["california-sea-lion", "galapagos-sea-lion"] },
  {
    id: "whales",
    label: "Whales",
    members: ["humpback-whale", "blue-whale", "sperm-whale", "dwarf-minke-whale"],
  },
  { id: "dolphins", label: "Dolphins", members: ["bottlenose-dolphin", "spinner-dolphin"] },
  {
    id: "octopuses",
    label: "Octopuses",
    members: ["octopus", "blue-ringed-octopus", "mimic-octopus", "wonderpus"],
  },
  { id: "frogfishes", label: "Frogfishes", members: ["frogfish", "hairy-frogfish"] },
];

export function getGroupDef(id: string) {
  return GROUP_DEFS.find((g) => g.id === id);
}

/**
 * Words that identify a species in free prose. Defaults to the full common name;
 * curated where notes use a shorter or colloquial form ("mantas", "mola").
 */
const EXTRA_ALIASES: Record<string, string[]> = {
  "reef-manta-ray": ["manta"],
  "giant-oceanic-manta-ray": ["oceanic manta", "manta"],
  "whale-shark": ["whale shark"],
  "scalloped-hammerhead": ["hammerhead"],
  "great-hammerhead": ["great hammerhead", "hammerhead"],
  "hammerhead-shark-unresolved-species": ["hammerhead"],
  "pelagic-thresher-shark": ["thresher"],
  "thresher-shark": ["thresher"],
  "ocean-sunfish": ["sunfish", "mola"],
  "green-turtle": ["green turtle", "turtle"],
  "hawksbill-turtle": ["hawksbill", "turtle"],
  "bull-shark": ["bull shark"],
  "tiger-shark": ["tiger shark", "tigers"],
  "blue-shark": ["blue shark"],
  "shortfin-mako": ["mako"],
  "whitetip-reef-shark": ["whitetip reef shark", "whitetips"],
  "oceanic-whitetip-shark": ["oceanic whitetip"],
  "grey-reef-shark": ["grey reef shark"],
  "humpback-whale": ["humpback"],
  "bumphead-parrotfish": ["bumphead"],
  "california-sea-lion": ["sea lion"],
  "galapagos-sea-lion": ["sea lion"],
  "bottlenose-dolphin": ["dolphin"],
  "spinner-dolphin": ["dolphin"],
  "pygmy-seahorse": ["pygmy seahorse", "pygmies"],
  "mobula-ray": ["mobula"],
  "sicklefin-devil-ray": ["devil ray", "mobula"],
  "spinetail-devil-ray": ["devil ray", "mobula"],
  "napoleon-wrasse": ["napoleon wrasse", "humphead wrasse"],
  "silvertip-shark": ["silvertip"],
};

export function aliasesFor(speciesId: string, name: string): string[] {
  return [...new Set([name.toLowerCase(), ...(EXTRA_ALIASES[speciesId] ?? [])])];
}
