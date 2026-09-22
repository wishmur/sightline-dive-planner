/**
 * Diver concerns: the questions that decide a trip but aren't filters.
 *
 * "I get seasick", "my partner doesn't dive", "I only have 30 dives". The fit
 * engine can't see these, and the records never use the diver's words: nobody
 * writes "seasick"; they write "a 10-hour open-sea crossing". Each concern has a
 * definition (what counts as evidence; also the labelling guideline for
 * evals/concerns.gold.ts) and, in lib/retrieve.ts, the terms used to find it.
 *
 * Things Sightline has no data on are listed separately so the product can say
 * so plainly instead of retrieving something that merely sounds related.
 */

export type ConcernId =
  | "seasickness"
  | "cold"
  | "non_diver"
  | "experience"
  | "current"
  | "crowds"
  | "visibility"
  | "weather"
  | "rules"
  | "remote"
  | "photography"
  | "depth"
  | "getting_there";

export type ConcernDef = {
  id: ConcernId;
  label: string;
  /** Short question form, shown to the diver. */
  question: string;
  /** What counts as evidence. Also the gold-labelling guideline. */
  definition: string;
};

export const CONCERNS: ConcernDef[] = [
  {
    id: "seasickness",
    label: "Seasickness & boat time",
    question: "Will I spend long hours on rough water?",
    definition:
      "Boat time and sea state: length of crossings or boat rides, open-ocean passages, swell, rough surface conditions, and access that is only possible by liveaboard or long boat trips.",
  },
  {
    id: "cold",
    label: "Cold water",
    question: "How cold is it, and what suit do I need?",
    definition:
      "Water temperature and exposure: temperatures or temperature drops, thermoclines, cold upwellings, and wetsuit or drysuit thickness.",
  },
  {
    id: "non_diver",
    label: "Non-diving partner",
    question: "Is there anything for someone who doesn't dive?",
    definition:
      "What a snorkeller or non-diver can do: encounters that are snorkel-only or snorkel-accessible, surface or land activities, and whether non-divers can join the boats.",
  },
  {
    id: "experience",
    label: "Enough experience?",
    question: "Is this within my experience?",
    definition:
      "Whether the diving suits a less experienced diver: minimum logged dives, certification requirements, skills needed (reef hooks, negative entries, SMB), check dives, and statements about who the diving is or isn't for.",
  },
  {
    id: "current",
    label: "Strong currents",
    question: "How strong are the currents?",
    definition:
      "Current strength and behaviour: drift diving, down-currents, surge, currents that vary by tide or site, and how currents shape which sites can be dived.",
  },
  {
    id: "crowds",
    label: "Crowds",
    question: "Will it be crowded?",
    definition:
      "Crowding: busy sites, numbers of boats or divers, times of day or seasons that are crowded or quiet, and caps on visitor numbers.",
  },
  {
    id: "visibility",
    label: "Visibility",
    question: "What's the visibility like?",
    definition:
      "Water clarity: visibility figures, plankton or runoff that reduce it, and how visibility changes by season or site.",
  },
  {
    id: "weather",
    label: "Weather & cancellations",
    question: "Could weather ruin the trip?",
    definition:
      "Weather and sea-state risk to the trip: rainy seasons, monsoons, typhoons or cyclones, wind, cancelled dives or trips, and buffer days.",
  },
  {
    id: "rules",
    label: "Permits, fees & rules",
    question: "Are there permits, fees or rules I should know?",
    definition:
      "Regulation: park fees, permits, quotas, closures by regulation, bans on scuba or activities, required guides, and encounter rules.",
  },
  {
    id: "remote",
    label: "Remoteness & medical",
    question: "How far is help if something goes wrong?",
    definition:
      "Remoteness and safety margins: distance from port or hyperbaric chambers, evacuation, isolation, and self-sufficiency needed.",
  },
  {
    id: "photography",
    label: "Photography",
    question: "Is it good for underwater photography?",
    definition:
      "Photography and video: subjects photographers come for, macro, light and conditions for shooting, and rules on cameras or lights.",
  },
  {
    id: "depth",
    label: "Depth & nitrox",
    question: "How deep is the diving?",
    definition:
      "Depth: site depths, deep profiles, depth limits for a certification, and nitrox or deep-diver requirements.",
  },
  {
    id: "getting_there",
    label: "Getting there",
    question: "How do I get there?",
    definition:
      "Access logistics: departure ports and hubs, flights and transfers, travel time to the sites, and which base reaches which sites.",
  },
];

export function getConcern(id: string) {
  return CONCERNS.find((c) => c.id === id);
}

export function isConcernId(id: string): id is ConcernId {
  return CONCERNS.some((c) => c.id === id);
}

/** Asked about, but Sightline holds no evidence for it: say so, don't guess. */
export const UNSUPPORTED = [
  { id: "cost", label: "Cost and budget" },
  { id: "accommodation", label: "Hotels and accommodation" },
  { id: "flights", label: "Flight prices and schedules" },
  { id: "visas", label: "Visas and entry rules" },
  { id: "operator_quality", label: "Which operator is best" },
] as const;

export type UnsupportedId = (typeof UNSUPPORTED)[number]["id"];

export function isUnsupportedId(id: string): id is UnsupportedId {
  return UNSUPPORTED.some((u) => u.id === id);
}
